# FASE 5 — Robustez profesional

Lo que falta para que el sistema sea verdaderamente "nivel comercial" y aguante operacion intensiva sin sorpresas.

---

## Objetivo

Que cuando algo falle en produccion (porque algo siempre falla), el sistema:
1. **Avise inmediato** al celular de Coronado
2. **Se recupere solo** en cuanto pueda
3. **Tenga informacion suficiente** para diagnosticar el problema sin estar fisicamente
4. **Pueda actualizarse remoto** sin tener que ir a la PC central

---

## A. Sentry — alertas a celular cuando algo truena

**Concepto:** Sentry captura todas las excepciones del backend y te manda push al celular en tiempo real con stack trace, request, headers, todo.

**Costo:** Plan Developer GRATIS hasta 5,000 errores/mes (mas que suficiente para Bar Avenida).

**Implementacion backend:**

1. Crear cuenta en https://sentry.io con tu mail nauexpos11@gmail.com
2. Crear proyecto "bar-avenida-api" tipo .NET
3. Agregar paquete:
   ```xml
   <PackageReference Include="Sentry.AspNetCore" Version="4.13.0" />
   ```
4. En `Program.cs`:
   ```csharp
   builder.WebHost.UseSentry(o => {
       o.Dsn = builder.Configuration["Sentry:Dsn"]; // en User Secrets
       o.SendDefaultPii = true;
       o.TracesSampleRate = 0.1; // 10% de requests para performance
       o.Environment = "Production";
   });
   ```
5. Guardar DSN en User Secrets:
   ```
   dotnet user-secrets set "Sentry:Dsn" "https://xxx@sentry.io/xxx"
   ```

**Implementacion frontend (Admin/Tablet/KDS):**

```bash
npm install --save @sentry/react
```

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxx@sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

**Notificaciones a celular:**
- App de Sentry para iOS/Android
- Configurar alerts: "Cualquier error nuevo" -> push inmediato
- Recibes notificacion mientras estas durmiendo si algo truena en el bar

---

## B. Tests automatizados del backend (xUnit)

**Estado actual:** 0 tests. Cualquier cambio puede romper algo y nadie se entera hasta produccion.

**Objetivo:** cobertura de los flujos criticos:
1. Login (Auth/login)
2. Abrir cuenta + agregar productos + cobrar
3. Cancelacion de cuenta
4. Cierre de caja
5. Aprobacion de solicitud de cancelacion

**Stack:**
- xUnit (estandar .NET)
- Microsoft.AspNetCore.Mvc.Testing (in-memory test server)
- FluentAssertions (asserts legibles)
- Bogus (datos falsos)

**Crear proyecto:**
```bash
cd F:\BarAvenida
dotnet new xunit -o BarAvenida.API.Tests
cd BarAvenida.API.Tests
dotnet add package Microsoft.AspNetCore.Mvc.Testing
dotnet add package FluentAssertions
dotnet add package Bogus
dotnet add reference ..\BarAvenida.API\BarAvenida.API.csproj
dotnet sln ..\BarAvenida.sln add BarAvenida.API.Tests.csproj
```

**Test ejemplo (tests/AuthControllerTests.cs):**
```csharp
public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    [Fact]
    public async Task Login_con_credenciales_validas_devuelve_token()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/Auth/login", new {
            codigo = "23",
            pin = "0001"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        body.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_con_pin_invalido_devuelve_401()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/Auth/login", new {
            codigo = "23",
            pin = "9999"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

**Plan de cobertura objetivo (3 sesiones):**

- Sesion 1: Tests de Auth + Mesas + Catalogo (lectura, basicos)
- Sesion 2: Tests de Cuentas (abrir, agregar producto, cobrar) - los mas criticos
- Sesion 3: Tests de Caja (corte X, corte Z, retiros, incidentes)

**Integrar al GitHub Actions CI:**
```yaml
- name: Run tests
  run: dotnet test --logger "console;verbosity=detailed"
```

Con eso, cualquier PR/push que rompa un test queda bloqueado automaticamente.

---

## C. Auto-update entre versiones de Electron

**Concepto:** cuando publiques v1.2.0 del Admin/KDS, los .exe instalados detectan y descargan la actualizacion sin que Coronado tenga que reinstalar manualmente.

**Stack:** electron-updater (oficial de electron-builder).

**Implementacion:**

1. Agregar paquete a `BarAvenida.Desktop/package.json`:
   ```json
   "dependencies": {
     "electron-updater": "^6.3.0"
   }
   ```

2. En `main.js`:
   ```javascript
   const { autoUpdater } = require('electron-updater')

   app.whenReady().then(() => {
       // ... codigo existente
       autoUpdater.checkForUpdatesAndNotify()
   })

   autoUpdater.on('update-available', () => {
       // Mostrar notificacion: "Nueva version disponible, descargando..."
   })

   autoUpdater.on('update-downloaded', () => {
       // Mostrar boton: "Reiniciar para aplicar actualizacion"
   })
   ```

3. Configurar canal de updates en `package.json` -> `build.publish`:
   ```json
   "publish": {
       "provider": "github",
       "owner": "nauexpos11-alt",
       "repo": "bar-avenida-pos",
       "private": true,
       "token": "TU_GITHUB_TOKEN"
   }
   ```

4. Para publicar nueva version:
   ```bash
   npm version patch  # 1.1.0 -> 1.1.1
   npm run build
   # electron-builder sube el .exe a GitHub Releases automaticamente
   ```

5. La PC del bar revisa cada hora si hay nueva version. Si si:
   - Descarga en background
   - Notifica "Nueva version lista, ¿reiniciar?"
   - Coronado da click y se actualiza solo

---

## D. Test maraton automatizado

**Spec:** `Scripts/test-maraton.ps1` (ya creado por Cowork)

**Uso antes de cada release:**
```powershell
F:\BarAvenida\Scripts\test-maraton.ps1 -Horas 15
```

Corre 15 horas simulando un dia completo:
- Health check cada 5 min
- Mide RAM del servicio (detecta memory leaks)
- Mide latencia de endpoints clave
- Verifica que SQL responda
- Genera log con veredicto final

**Si pasa el test maraton sin fallas y RAM no sube >100MB, sistema APROBADO para 13-15 horas continuas.**

---

## E. Documentacion tecnica con MkDocs Material

**Por que:**
- Cuando alguien (incluyendo tu mismo en 6 meses) quiera entender como funciona algo, necesita docs claros
- MkDocs Material es bonito y se publica gratis en GitHub Pages

**Estructura propuesta:**
```
docs/
├── index.md                    Bienvenida
├── arquitectura.md             Como esta armado el sistema
├── instalacion.md              Como instalar en una PC nueva
├── operacion/
│   ├── arrancar-bar.md         Checklist al abrir el bar
│   ├── cerrar-bar.md           Checklist al cerrar
│   └── solucionar-problemas.md FAQ con problemas comunes
├── desarrollo/
│   ├── stack.md                Tecnologias usadas
│   ├── deploy.md               Como deployar cambios
│   └── tests.md                Como correr tests
└── api/
    └── endpoints.md            Documentacion de la API
```

**Setup:**
```bash
pip install mkdocs-material
mkdocs new bar-avenida-docs
cd bar-avenida-docs
mkdocs serve  # localhost:8000 para preview
mkdocs gh-deploy  # publica a github pages
```

URL final: `https://nauexpos11-alt.github.io/bar-avenida-pos/`

---

## F. Health endpoint publico para UptimeRobot

**Concepto:** un servicio externo (UptimeRobot, gratis) checa cada 5 min si tu sistema responde. Si no, te manda email/SMS.

**Implementacion:**
1. Endpoint `GET /api/health/public` que responde:
   ```json
   { "status": "ok", "timestamp": "...", "uptime": "..." }
   ```
2. Crear cuenta en uptimerobot.com (gratis hasta 50 monitores)
3. Configurar monitor HTTP a `https://baravenida.tu-dominio.com/api/health/public` cada 5 min
4. Si tu router del bar tiene IP publica, expones puerto 7000 con HTTPS (LetsEncrypt)
5. Si no tiene IP publica, usar tunnel: ngrok / Cloudflare Tunnel (gratis)

**Resultado:** te llega email/SMS si el bar pierde luz o se cae el internet.

---

## Plan de implementacion FASE 5

| Etapa | Esfuerzo | Costo |
|---|---|---|
| Sentry backend + frontends | 2 horas | Gratis |
| Tests xUnit (3 sesiones) | 8 horas | Gratis |
| Auto-update Electron | 3 horas | Gratis |
| Test maraton (script ya hecho) | - | Gratis |
| MkDocs Material | 2 horas | Gratis |
| UptimeRobot + tunnel | 2 horas | Gratis |
| **TOTAL** | **~17 horas** | **$0** |

---

## Cuando arrancar

**Despues de:**
1. ✅ Round 3 cleanup completo y validado
2. ✅ POS operando estable en el bar 1-2 semanas

**Por que esperar:** quieres datos REALES de uso para saber donde se rompe primero. No tiene sentido testear sintetico todo si en produccion el bug viene de un caso que no contemplaste.

**Orden recomendado:**
1. Sentry primero (te avisa si algo falla)
2. Test maraton (validar 15 horas continuas)
3. Tests xUnit (red de seguridad para nuevos cambios)
4. Auto-update (cuando empieces a publicar versiones rapido)
5. MkDocs (cuando alguien mas necesite entender el sistema)
6. UptimeRobot (al final, cuando el bar tenga IP publica)
