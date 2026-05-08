# Bar Avenida POS — Contexto del Proyecto

> Este archivo es leído por Claude Cowork y Claude Code.
> Mantenerlo siempre actualizado al final de cada sesión.

## 1. Propietario y bar

- **Owner:** Coronado (Victor Alejandro Coronado Solís)
- **Bar:** Bar Avenida — cantina tradicional mexicana
- **Dirección:** Calle Matamoros #1056, Zona Centro, Saltillo, Coahuila, CP 25000
- **Tel:** 844 130 7069
- **Operación:** Solo bebidas (no cocina), ~50 mesas
- **Personal:** meseras + barman + admin
- **Hardware del bar:** PC Admin con impresora térmica GHIA GTP801 USB ESC/POS 80mm + cajón RJ-11

## 2. Stack tecnológico

### Backend
- **ASP.NET Core .NET 8**
- **Entity Framework Core** + SQL Server LocalDB
- **SignalR** para tiempo real (eventos: `CuentaPorCobrar`, `MesaPorCobrar`, `SolicitudCancelacion`, `SolicitudResuelta`, etc.)
- **JWT** para autenticación
- **BCrypt** para hashing de PINs
- Puerto: **7000**

### Frontend
- **Tablet meseras**: React + Vite (puerto 3002)
- **Admin dashboard**: React + Vite + Electron (BarAvenida.Desktop wrapper)
- **KDS barra**: React + Vite

### Tema visual
- Color primario: **dorado #f0c842**
- Fondo: **negro #0a0a0a**
- Tipografía: limpia, sans-serif

## 3. Estructura de carpetas

```
F:\BarAvenida\
├── BarAvenida.API\            (backend .NET 8)
│   ├── Controllers\
│   ├── Models\
│   ├── DTOs\
│   ├── Data\BarAvenidaDbContext.cs
│   └── Migrations\
├── BarAvenida.Tablet\         (React Vite, puerto 3002)
│   └── src\
│       ├── api.js
│       ├── screens\
│       └── components\
├── BarAvenida.Admin\          (React Vite + Electron)
│   └── src\
├── BarAvenida.KDS\            (barra)
├── BarAvenida.Desktop\        (Electron wrapper del Admin)
├── TicketsImpresos\
└── CLAUDE.md                  (este archivo)
```

## 3.5. Repositorio Git

- **GitHub privado:** https://github.com/nauexpos11-alt/bar-avenida-pos
- **Owner GitHub:** `nauexpos11-alt`
- **Branch principal:** `main`
- **Push rápido:** `F:\BarAvenida\Scripts\git-push.ps1 "mensaje"`
- **.gitignore** excluye `node_modules`, `bin/obj`, `dist`, `*.bak`, `Logs/`, `TicketsImpresos/`, `appsettings.Production.json`
- API key Claude vive en User Secrets de .NET, NO en el repo

## 4. Credenciales por defecto

- **Admin:** `ADMIN` / PIN `1234` (rol="Admin")
- **Mesera:** `23` / PIN `0001` (ABBY GZZ)
- **Barman:** `BAR1` / PIN `0002`

## 5. Reglas de negocio (decisiones del owner)

- **Métodos de pago:** Efectivo, Tarjeta, Mixto. **NO transferencia.**
- **Comisión 5%** en tarjeta la paga el **CLIENTE** (no se descuenta del bar).
- **RFC opcional** con toggle.
- **Print-first puro:** si falla la impresión, NO se cobra.
- **Cajón:** abre AUTO solo si hay efectivo en el cobro.
- **Datos del bar:** editables desde el Admin.
- **Propinas:** NO entran al sistema (las maneja la mesera aparte).
- **Cobro:** lo hace SOLO el ADMIN. La mesera solicita; el admin ejecuta.
- **Cancelaciones:** mismo patrón. La mesera solicita; el admin aprueba o rechaza.

## 6. Flujos clave del sistema

### Cobro (FIX 1 — implementado)
1. Mesera abre mesa, captura productos, envía al KDS.
2. Cliente pide cuenta → mesera presiona **"💵 SOLICITAR COBRO"**.
3. Cuenta cambia a `Estado="PorCobrar"`.
4. Mesa se vuelve naranja en la tablet con monto visible.
5. Admin ve la cuenta en su pantalla "Cuentas por cobrar".
6. Admin cobra (efectivo/tarjeta/mixto), imprime ticket, da cambio.
7. Cuenta pasa a `Estado="Cobrada"`, mesa queda libre.

### Cancelación de productos/cuenta (PROMPT B2 — en validación)
1. Mesera marca productos con checkboxes (o pide cancelar cuenta entera).
2. Selecciona motivo del dropdown.
3. Presiona **"📤 SOLICITAR CANCELACIÓN"**.
4. Mesa se vuelve **morada** con texto "🔔 SOLICITUD".
5. Admin ve la solicitud en su pantalla **(PROMPT B3 pendiente)**.
6. Admin aprueba (cancela) o rechaza.
7. Tablet recibe `SolicitudResuelta`, mesa vuelve al color normal.

## 7. Estados de las mesas (en tablet)

| Estado | Color | Clickeable | Texto |
|--------|-------|-----------|-------|
| Libre | Verde | Sí | "LIBRE" |
| Mía (mesera logueada) | Amarilla con borde dorado | Sí | mesera + monto |
| Otra mesera | Roja | NO (disabled) | mesera + "🔒 OCUPADA" |
| Por cobrar | Naranja | NO | mesera + monto + "💵 COBRANDO" |
| Con solicitud | Morada | NO | mesera + monto + "🔔 SOLICITUD" |
| Pendiente | Naranja claro | Sí | "PENDIENTE" |

## 8. Endpoints clave del backend

### Auth
- `POST /api/Auth/login`
- `POST /api/Auth/cambiar-pin`
- `POST /api/Auth/validar-pin-admin` (para validar PIN admin desde tablet)
- `POST /api/Auth/cambiar-pin-admin`

### Cuentas
- `GET /api/Cuentas/{id}`
- `GET /api/Cuentas/abiertas`
- `GET /api/Cuentas/por-cobrar`
- `POST /api/Cuentas/{id}/solicitar-cobro`
- `POST /api/Cuentas/{id}/cobrar` (admin)
- `POST /api/Cuentas/{id}/cancelar` (admin con body `{pin, motivo}`)
- `POST /api/Cuentas/{id}/solicitar-cancelacion-productos`
- `POST /api/Cuentas/{id}/solicitar-cancelacion-cuenta`

### Solicitudes (NUEVO)
- `GET /api/SolicitudesCancelacion/pendientes`
- `POST /api/SolicitudesCancelacion/{id}/aprobar`
- `POST /api/SolicitudesCancelacion/{id}/rechazar`

### Caja
- `POST /api/Caja/abrir-turno`
- `POST /api/Caja/cerrar-turno`
- `GET /api/Caja/turno-actual`

### Admin
- `GET /api/admin/meseros`
- `POST /api/admin/meseros`
- `PUT /api/admin/meseros/{id}`
- `DELETE /api/admin/meseros/{id}` (soft delete)
- `DELETE /api/admin/meseros/{id}/permanent` (hard delete si no tiene cuentas)
- `GET /api/admin/formas-pago`
- `POST /api/admin/formas-pago/seed` (inicializar Efectivo, Tarjeta, Mixto)

## 9. Eventos SignalR

### Hub: `/barhub`

#### Grupos
- `Admin` — recibe eventos para el admin
- `Meseras` — recibe eventos para las tablets
- `Tablet` — alias de Meseras
- `KDS` — recibe órdenes nuevas

#### Eventos
- `CuentaAbierta` — cuando se abre una cuenta nueva
- `CuentaPorCobrar` — cuando mesera solicita cobro
- `MesaPorCobrar` — recibe mesaId, mesa se pone naranja
- `CuentaCobrada` — cuando admin termina cobro
- `SolicitudCancelacion` — recibe payload completo, mesa se pone morada
- `SolicitudResuelta` — recibe `{mesaId, estado}`, mesa vuelve a color normal
- `OrdenNueva` — para KDS

## 10. Reglas de oro al implementar

- **Builds:** siempre 0 errors, 0 warnings (backend dotnet, frontend npm).
- **Migraciones EF:** OK crearlas si hay modelo nuevo. Aplicar limpio con `dotnet ef database update`.
- **NO instalar librerías nuevas** sin pedir permiso.
- **NO ejecutar `dotnet run` o `npm run dev`** desde el agente — solo build/migrate.
- **Antes de cada sesión grande:** `taskkill /F /IM BarAvenida.API.exe /T` para asegurar que no esté corriendo.
- **Conservar archivos JSX/CSS** aunque queden sin uso.
- **Idioma:** mensajes al usuario en español casual mexicano.
- **Si encuentras ambigüedad:** decide tú lo mejor y reporta.

## 11. Roadmap

### Fase 0 — Cierre de cancelaciones ✅ CERRADA
- [x] B2 backend + tablet
- [x] B3 — Pantalla admin de solicitudes pendientes con SignalR (build 0/0, 208ms)
- [x] B3.5 — Validación end-to-end (3/3 casos PASS, pilotada por Cowork via Chrome MCP)

### Bonus post-Fase 2 ✅ COMPLETO (D + E)
- [x] **PROMPT D — Dashboard Vivo** — implementado por Claude Code y validado E2E (Mayo 7 2026). Pantalla nueva `DashboardLiveScreen` accesible desde menú REPORTES. Endpoint `GET /api/admin/dashboard/live` con 8 métricas: ventas/cuentas/ticket con delta % vs ayer, productos vendidos hoy, ventas por hora, top 5 productos, mesera top, hora pico. Frontend con KPI cards (delta verde/roja), LineChart recharts, BarChart top productos. Auto-refresh 30s + SignalR push en `CuentaCobrada`.
- [x] **PROMPT E — Reportes interpretativos** — implementado por Claude Code y validado E2E (Mayo 7 2026). Pantalla nueva `InformeDiaScreen` con selector de fecha (default hoy). Endpoint `GET /api/admin/reportes/informe-dia` retorna 5 secciones: Resumen ejecutivo (narrativa + 4 KPIs), Highlights (top producto/mesera/hora pico), Comparativas (ayer + semana anterior), Anomalías (cancelaciones + incidentes con severidad), Recomendaciones automáticas (5 heurísticas configurables en `Caja:Reportes:Heuristicas`). Validado: detectó 2 incidentes de C.3 (Faltante $80 Amarilla + Faltante $300 Roja), aplicó heurística "Muchos productos sin movimiento" (119 productos sin venta en 7 días).

### Fase 2 — Asistencia inteligente ✅ CERRADA AL 100%
- [x] **PROMPT H — Anti-fuga** — implementado por Claude Code y validado E2E (Mayo 7 2026, Cowork). Extiende `DetectorAlertasCaja` con método `EvaluarMesasInactivas` que cada 60s busca cuentas `Estado="Abierta"` con última `Orden.FechaEnvio` (o `FechaApertura` si sin órdenes) > umbral. Emite `AlertaCaja Tipo="MesaInactiva"`. Frontend agrega icono 🚪 en `AlertasDrawer`. Configurable en `Caja:Umbrales:MinutosSinActividadMesa` (default 30).
- [x] **PROMPT G — Smart suggestions (cross-sell)** — implementado por Claude Code y validado E2E. Tabla nueva `ReglasCrossSell` con índice único, CRUD admin, endpoint público `GET /api/Productos/{id}/sugerencias`. Pantalla nueva `ReglasCrossSellScreen` en menú CATÁLOGOS. Banner inline "💡 También sugerimos" en tablet con chips clickeables que filtran productos ya en carrito.
- [x] **PROMPT F — KDS Auto-pilot** — implementado por Claude Code y validado E2E. Solo frontend del KDS, ~410 líneas. Nuevo componente `MesaCard.jsx/css` que reemplaza `OrdenCard` (conservada en disco por regla de oro). App.jsx agrupa órdenes por mesa con `useMemo`, ordena por orden más vieja (urgentes arriba), calcula métricas (total mesas / min promedio / urgentes). Banner de métricas en header del KDS. Cards con borde rojo + badge "🔥 URGENTE" + animación pulse cuando tiempo ≥ 5 min. Botón LISTO sigue marcando UNA orden a la vez. Validado con 2 mesas viejas de 134/133 min de espera.

### Fase 1 — Inteligencia operativa ✅ CERRADA
- [x] **C.1 — Sugerencia de fondo** — implementado y validado E2E (Mayo 7 2026, Cowork). Endpoint `GET /api/Caja/sugerencia-fondo` + hint dorado en modal Abrir Turno + botón USAR. Configurable en `appsettings.json` sección `Caja:FondoSugerido`.
- [x] **C.2 — Alertas activas** — implementado y validado E2E (Mayo 7 2026, Cowork). `BackgroundService DetectorAlertasCaja` corre cada 60s detectando efectivo > umbral y tiempo sin Corte X > umbral. Emite `AlertaCaja` via SignalR al grupo Admin. Frontend: botón ⚠ amarillo pulsante en `TopMenuBar` con badge contador, click abre `AlertasDrawer` lateral derecho con cards (severidad amarilla/roja), botones "Descartar" y acción navegacional. Umbrales finales en `Caja:Umbrales`: CajonMaximoEfectivo=5000, HorasSinCorteX=4.
- [x] **C.3 — Cierre asistido + IncidentesCaja** — implementado por **Claude Code** siguiendo `specs/c3_cierre_asistido.md` (8m 19s, sin errores) y validado E2E por Cowork (Mayo 7 2026). Migración EF `IncidentesCaja` aplicada limpio. Endpoint `cerrar-turno` ahora calcula severidad (Verde/Amarilla/Roja con umbrales `Caja:Umbrales:DiferenciaVerde/Amarilla`), valida justificación obligatoria si Roja (mín 10 chars, retorna HTTP 400 si insuficiente), crea `IncidenteCaja` cuando diferencia ≠ 0. Endpoint nuevo `GET /api/Caja/incidentes` con paginación. Frontend: modal "Cerrar Turno" con banner verde/amarillo/rojo + textarea condicional + asterisco rojo si obligatoria. Tab "Incidentes" en `CortesCajaScreen` con filtros (Últimos 7d/30d/custom) y tabla de 9 columnas. `Modal.jsx` extendido con prop `accionDeshabilitada` para soportar botón deshabilitado. Item "Histórico de incidentes" en menú CAJA. Validados los 3 escenarios + bypass del botón deshabilitado.

### Fase 1 — Inteligencia operativa
- [ ] PROMPT C — Caja inteligente (sugerir fondo, alertas, cierre asistido)
- [ ] PROMPT D — Dashboard vivo del admin (KPIs en tiempo real)
- [ ] PROMPT E — Reportes interpretativos al final del día

### Fase 2 — Asistencia inteligente ✅ CERRADA
- [ ] PROMPT F — KDS Auto-pilot (agrupa órdenes, prioridad por tiempo)
- [x] **PROMPT G — Smart suggestions (cross-sell automático)** — implementado por Claude Code (Mayo 7 2026). Modelo `ReglaCrossSell` con FK doble a Producto (NoAction) + índice único. Migración `ReglasCrossSell` aplicada. Controller con 5 endpoints (GET/POST/PUT/DELETE admin + GET sugerencias tablet). Admin: pantalla `ReglasCrossSellScreen` con tabla, toggle activo, modal nueva regla con 2 selects cargados de `adminGetProductos`. Tablet: `agregarProducto` dispara `getSugerencias`, banner `cs-sugerencias` aparece inline en comanda con chips nombre+precio, filtro excluye ya-en-carrito, se limpia en ACEPTAR y CANCELA. Builds: Backend 0/0 (1.58s), Admin 0/0 (243ms), Tablet 0/0 (197ms).
- [x] **PROMPT H — Anti-fuga** — implementado por Claude Code y validado E2E (Mayo 7 2026). Ver Fase 2 arriba.

### Fase 3 — IA integrada
- [x] **PROMPT IA.1 — Análisis IA del Informe del Día** — implementado por Claude Code y validado E2E (Mayo 7 2026).
      Provider configurable Mock/Claude/Ollama con fallback automático.
      Backend: `AsistenteService.cs` (HttpClient → Anthropic Messages API), `Settings/AsistenteSettings.cs`,
      endpoint `POST /api/admin/reportes/analisis-ia`.
      Frontend: botón "Pedir analisis IA" en `InformeDiaScreen.jsx` con render Markdown (H1/H2, **negritas**, listas).
      Configuración en `appsettings.json`: `Asistente.Provider="Claude"`, modelo `claude-haiku-4-5-20251001`, MaxTokens=800.
      **Validado:** análisis real de Claude (446 tokens) en español casual mexicano detectó las 2 anomalías
      de cierre ($80 + $300 = $380 faltante), sumó montos y propuso 5 acciones concretas + auditoría inmediata.
- [ ] Chat asistente flotante en admin (siguiente extensión natural de IA.1)
- [ ] Voice mode para meseras

### Fase 4 — Distribución
- [ ] PWA móvil (meseras usan su celular)
- [ ] Empaquetar Admin como .exe
- [ ] Hospedar en cloud (opcional)

### Fase 5 — Experiencia cliente
- [ ] WhatsApp del bar (cliente pide desde su tel)
- [ ] Pidemusic Spotify
- [ ] Loyalty automático

## 12. Estilo de comunicación con Coronado

- Hablar en **español casual mexicano**.
- Ser **directo y honesto**, sin endulzar.
- Confirmar antes de hacer cambios destructivos.
- Validar al final de cada bloque grande.
- Usar **emojis con moderación** (⚠️ ✅ 🚀 🍺) para hacer el reporte legible.
- Reportar **siempre** al terminar:
  - Archivos modificados
  - Resultado del build
  - Decisiones tomadas
  - Pendientes / próximos pasos

## 13. Memoria de sesiones (actualizar al cerrar)

### Sesión Mayo 7, 2026 (anterior)
- B1, B1.1 completos (cancelaciones, PIN modal, descripción productos)
- A completo (logo login, mesas color, modal limpio, resumen limpio)
- B2 ejecutándose (backend + tablet, sin pantalla admin todavía)

### Sesión Cowork, Mayo 6-7, 2026 (B3)
- ✅ Implementado **PROMPT B3** completo por Cowork (no Claude Code):
  - Nuevo: `BarAvenida.Admin/src/screens/SolicitudesPendientesScreen.jsx` + `.css`
  - Nuevo: `getSolicitudesPendientes`, `aprobarSolicitud`, `rechazarSolicitud` en `api.js`
  - Modificado: `App.jsx` (case `solicitudes-pendientes`)
  - Modificado: `TopMenuBar.jsx` (item nuevo + badge contador rojo pulsante con SignalR)
  - Modificado: `TopMenuBar.css` (estilos del badge)
- ✅ Cards diferenciadas Producto (morado) vs Cuenta (rojo), botones APROBAR/RECHAZAR de 56px, modal de confirmación, SignalR auto-refresh, contador rojo en VENTAS.
- ✅ Cero librerías nuevas, cero cambios en backend, cero migraciones EF.
- ✅ Builds verificados: **Admin 0/0 (208ms), Tablet 0/0 (409ms), Backend 0/0 (9.8s)**.
- ✅ **Validación end-to-end 3/3 PASS** (Mayo 6, 2026, pilotada por Cowork via Chrome MCP):
  - Caso A: Cancelación productos + APROBAR → backend borró OrdenDetalles, total recalculado, mesa volvió a estado normal con producto restante intacto.
  - Caso B: Cancelación cuenta + RECHAZAR → cuenta conservada, mesa volvió a normal.
  - Caso C: Multi-solicitud (2 cards simultáneas) + F5 → badge contador rehidrató desde API en mount, persistencia OK, decremento correcto.
- ✅ **Fix bonus aplicado:** `ResumenCuentaScreen` de la Tablet ahora escucha `SolicitudResuelta` (grupo "Meseras") y auto-refresca: si aprueban cuenta entera redirige al grid con toast; si aprueban productos recarga la cuenta con toast; si rechazan recarga silenciosa. Build Tablet 0/0 (160ms, +0.42 kB).
- ✅ Launcher creado: `F:\BarAvenida\dev-start.ps1` levanta backend + tablet + admin con un comando. Flag `-Reset` limpia bin/obj.

### Troubleshooting conocido

**MSB4018 en `DefineStaticWebAssets` con `JsonException: '0x00'`:**
Cache corrupto de static web assets en `obj/`. Suele pasar cuando un build anterior se interrumpe o si el SDK 10.x preview deja archivos mal escritos. Fix:
```powershell
cd F:\BarAvenida\BarAvenida.API
Remove-Item -Recurse -Force bin, obj -ErrorAction SilentlyContinue
dotnet build
```

### Próximos pasos sugeridos
1. ✅ Builds de los 3 proyectos verificados (Admin 0/0, Tablet 0/0 incl. fix bonus, Backend 0/0).
2. ✅ B3.5 ejecutado y validado por Cowork via Chrome MCP (3/3 casos PASS).
3. ✅ Fix bonus del ResumenCuentaScreen aplicado.
4. ✅ **PROMPT C.1 implementado y validado E2E** (Cowork, Mayo 7 2026). Sugerencia de fondo de caja con histórico funciona: ingresa al modal "Abrir Turno", muestra hint dorado con monto recomendado + justificación, botón "USAR" auto-llena. Probado con 1 turno cerrado del mismo día → sugiere correctamente $1,500.
5. ✅ **PROMPT C.2 y C.3 implementados y validados E2E** (Mayo 7 2026). Fase 1 completa.
6. **Próximo: PROMPT D — Dashboard vivo** (KPIs en tiempo real para admin) o **E — Reportes interpretativos**. Aún no especificados.

### Aprendizajes de la sesión
- **Claude Code rinde excelente cuando recibe un spec maduro.** C.3 fue implementado completo en 8m 19s con 0 errores y una decisión de diseño inteligente (extender `Modal.jsx` con prop `accionDeshabilitada` en vez de hackear).
- **Cowork orquestador + Claude Code implementador + Cowork validador con Chrome MCP** = pipeline limpio. Funciona muy bien.
- **El bug MSB4018 del SDK 10.x** apareció al menos 2 veces. Documentado el remedio (clean bin/obj).
- **Las terminales en computer-use son tier "click"** — Cowork no puede escribir en ellas, solo clickear. Para invocar Claude Code, Coronado tiene que ejecutar manualmente. Para ahorrarle pasos, Cowork puede usar `clipboardWrite` y dejar el comando listo para Ctrl+V.

### Decisiones de PROMPT C (tomadas por Cowork, sujetas a revisión de Coronado)
- **Umbrales:** $5,000 cajón, 4h sin corte X, ±$50 verde, ±$200 amarillo, >$200 rojo.
- **Configurabilidad:** hardcoded en `appsettings.json` al inicio (UI editable se difiere).
- **Justificación:** obligatoria si severidad Roja (mín 10 caracteres, validado en backend).
- **UI alertas:** badge amarillo en TopMenuBar (consistencia con B3) + drawer lateral derecho.
- **Histórico incidentes:** tab nuevo dentro de `CortesCajaScreen` (no pantalla nueva).

### Sesión Cowork, Mayo 7, 2026 — Cierre de Fase 3 (IA.1)
- ✅ **PROMPT IA.1 — Análisis IA del Informe del Día** implementado por Claude Code en una sola pasada y validado E2E por Cowork via Chrome MCP.
- Backend nuevo:
  - `Settings/AsistenteSettings.cs` (Provider + Claude + Ollama)
  - `Services/AsistenteService.cs` (HttpClient → Anthropic Messages API o Ollama local) con fallback automático a Mock si falla el provider real.
  - Endpoint `POST /api/admin/reportes/analisis-ia` en `ReportesInterpretativosController.cs`.
  - `appsettings.json` extendido con sección `Asistente` (Provider="Claude", Model="claude-haiku-4-5-20251001", MaxTokens=800).
- Frontend Admin:
  - `InformeDiaScreen.jsx`: nueva sección "ANALISIS IA" con botón morado "Pedir analisis IA", estado `analizando`, render Markdown inline (componente `MarkdownSimple` con H1/H2/negritas/listas).
  - `api.js`: método `adminAnalisisIa(token, fecha)`.
- **Validación E2E:** click en botón → backend llama Anthropic API → respuesta en ~6s → render limpio con metadata "CLAUDE · CLAUDE-HAIKU-4-5-20251001 · 446 TOKENS" + análisis en español casual mexicano detectando las 2 anomalías de cierre ($80 + $300 = $380 faltante) con 5 acciones concretas.
- **Garantía de continuidad:** si la API key se acaba o Coronado la quita, sistema sigue funcionando 100% (las 10 features principales no dependen de Claude). Solo el botón IA cae a Mock con plantilla heurística pre-escrita.
- **API key configurada en `appsettings.json` directamente** (Coronado decidió, simple para arrancar). Migrar a User Secrets / variables de entorno cuando se empaquete en .exe.
- **Roadmap restante:**
  - Fase 3 IA: chat asistente flotante (siguiente extensión natural — usar mismo `AsistenteService` con prompts contextuales).
  - Limpieza de mesas viejas en BD (M6 con 1717 min sin actividad sigue saliendo en alertas).
  - Fase 4: PWA mobile + empaquetado .exe Admin con Electron.
  - Fase 5: WhatsApp del bar, loyalty, Pidemusic.
