# SPEC v2 — Tablet Meseras: corrección integral de flujo cuenta-mesa + alias persistente

**Fecha:** 2026-05-08
**Owner:** Coronado
**Stack afectado:** Backend (.NET 8) + Tablet (React)
**Origen:** Coronado detectó que cuando una segunda mesera entra, ve mesas que están realmente ocupadas/cobrando como LIBRES. Además los alias se guardan en localStorage y no se sincronizan ni se limpian.

---

## Bugs raíz identificados

1. **`MesasController.ObtenerMesas` filtra solo cuentas `Estado="Abierta"`.** Cuando se solicita cobro la cuenta pasa a `Estado="PorCobrar"` y la mesa aparece **Libre** para cualquiera que recargue la lista. → Se pierde estado en otras sesiones.
2. **`MesaDto` no expone `MeseraActualId`.** El frontend depende de comparar nombres para saber si la mesa es "mía" o de "otra mesera" — frágil cuando hay nombres repetidos.
3. **`MesaDto` no expone `EstadoCuenta`.** El frontend no sabe distinguir entre mesa Ocupada normal y Mesa con cobro pendiente sin depender de SignalR — si la mesera entra después del evento, no ve el estado correcto.
4. **El alias ("Mesa Señor", "Cumple Lupita") se guarda en `localStorage`.** No se sincroniza entre dispositivos, no se limpia al cerrar la cuenta, y persiste indefinidamente.

---

## Estrategia (sin migration de BD)

Reutilizar el campo **`NombreCliente`** que ya existe en `Cuenta` (modelo y BD) como el alias. Es opcional, no rompe nada existente, y se "limpia" automáticamente cuando la cuenta cambia de estado a Cobrada/Cancelada (porque MesasController solo lo expone si la cuenta está Abierta o PorCobrar).

**Resultado:** alias sincronizado entre dispositivos, persistente mientras la cuenta esté activa, automáticamente desaparece al cerrar.

---

## Reglas globales

1. **NO instalar paquetes nuevos.** Backend y frontend usan lo que ya tienen.
2. **NO ejecutar `npm run dev`** ni `dotnet run`. Solo `dotnet build`, `dotnet publish` y `npm run build`.
3. **Antes de tocar el binario del servicio:** `Stop-Service BarAvenidaAPI`. Después: `Start-Service`.
4. **Build con 0 errors y 0 warnings.**
5. **Conservar archivos JSX/CSS aunque queden sin uso.**
6. El servicio Windows REAL corre desde `C:\Program Files\Bar Avenida\Server\`. Hay que reemplazar el binario ahí, no solo en `F:\BarAvenida\BarAvenida.API\bin\Release\`.
7. **NO hacer migration de BD.** Reutilizar `NombreCliente` (ya existe en la entidad Cuenta).

---

## PARTE A — BACKEND

### A.1 — `MesasController.cs`: incluir cuentas "PorCobrar" + nuevos campos

**Archivo:** `F:\BarAvenida\BarAvenida.API\Controllers\MesasController.cs`

Reemplazar el `ObtenerMesas()` y `ObtenerMesa()` para que la búsqueda de cuenta abierta acepte ambos estados activos:

```csharp
var cuentaAbierta = await _context.Cuentas
    .Include(c => c.Mesera)
    .FirstOrDefaultAsync(c => c.MesaId == mesa.Id
        && (c.Estado == "Abierta" || c.Estado == "PorCobrar"));
```

Y construir el DTO incluyendo los nuevos campos:

```csharp
var dto = new MesaDto
{
    Id              = mesa.Id,
    Numero          = mesa.Numero,
    AreaId          = mesa.AreaId,
    AreaNombre      = mesa.Area?.Nombre ?? "",
    Capacidad       = mesa.Capacidad,
    Estado          = cuentaAbierta != null ? "Ocupada" : "Libre",
    CuentaActivaId  = cuentaAbierta?.Id,
    TotalActual     = cuentaAbierta?.Total,
    MeseraActual    = cuentaAbierta?.Mesera?.Nombre,
    MeseraActualId  = cuentaAbierta?.MeseraId,            // NUEVO
    EstadoCuenta    = cuentaAbierta?.Estado,              // NUEVO ("Abierta" o "PorCobrar")
    AliasCuenta     = cuentaAbierta?.NombreCliente,       // NUEVO (alias personalizado)
    FechaApertura   = cuentaAbierta?.FechaApertura
};
```

Aplicar los mismos cambios a ambos métodos (ObtenerMesas y ObtenerMesa).

### A.2 — `MesaDto.cs`: agregar los 3 campos nuevos

**Archivo:** `F:\BarAvenida\BarAvenida.API\DTOs\MesaDto.cs`

```csharp
namespace BarAvenida.API.DTOs;

public class MesaDto
{
    public int Id { get; set; }
    public string Numero { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaNombre { get; set; } = string.Empty;
    public int Capacidad { get; set; }
    public string Estado { get; set; } = "Libre"; // Libre, Ocupada
    public int? CuentaActivaId { get; set; }
    public decimal? TotalActual { get; set; }
    public string? MeseraActual { get; set; }
    public int? MeseraActualId { get; set; }       // NUEVO
    public string? EstadoCuenta { get; set; }      // NUEVO ("Abierta" o "PorCobrar")
    public string? AliasCuenta { get; set; }       // NUEVO
    public DateTime? FechaApertura { get; set; }
}
```

### A.3 — `CuentasController.AbrirCuenta`: aceptar y guardar el alias

**Archivo:** `F:\BarAvenida\BarAvenida.API\Controllers\CuentasController.cs`

Buscar el endpoint de abrir cuenta (POST que acepta `mesaId`, `meseraId`, `numeroPersonas`). Modificar el DTO de input y la creación de la entidad para aceptar `nombreCliente` opcional como alias.

DTO (probablemente en `CuentaDtos.cs`):

```csharp
public class AbrirCuentaDto
{
    public int? MesaId { get; set; }
    public int MeseraId { get; set; }
    public int NumeroPersonas { get; set; } = 1;
    public string? NombreCliente { get; set; }  // ahora se usa también como alias
}
```

En el endpoint:

```csharp
var cuenta = new Cuenta
{
    MesaId         = dto.MesaId,
    MeseraId       = dto.MeseraId,
    NumeroPersonas = dto.NumeroPersonas,
    NombreCliente  = string.IsNullOrWhiteSpace(dto.NombreCliente) ? null : dto.NombreCliente.Trim(),
    Estado         = "Abierta",
    // ... resto igual
};
```

Si ya existe el campo, solo asegurar que se guarde correctamente (con Trim y validación de vacío).

### A.4 — Asegurar que SignalR emite `MesaActualizada` después de solicitar cobro

**Archivo:** `F:\BarAvenida\BarAvenida.API\Controllers\CuentasController.cs`

En `SolicitarCobro` (alrededor de línea 522 actual), después de cambiar `cuenta.Estado = "PorCobrar"` y guardar, además del `MesaPorCobrar(mesaId)` que ya emite, agregar:

```csharp
await _hub.Clients.Group("Admin").SendAsync("CuentaPorCobrar", dto);
await _hub.Clients.Group("Meseras").SendAsync("MesaPorCobrar", cuenta.MesaId);

// NUEVO: refrescar el estado de la mesa para todos
await _hub.Clients.All.SendAsync("MesaActualizada", new {
    id             = cuenta.MesaId,
    estado         = "Ocupada",
    cuentaActivaId = cuenta.Id,
    totalActual    = cuenta.Total,
    meseraActual   = cuenta.Mesera?.Nombre,
    meseraActualId = cuenta.MeseraId,
    estadoCuenta   = "PorCobrar",
    aliasCuenta    = cuenta.NombreCliente,
});
```

Lo mismo cuando se libere la mesa al cobrar (que el frontend reciba estado="Libre" y los demás campos en null).

### A.5 — `CuentasController.AbrirCuenta`: emitir SignalR con alias

Después de crear y guardar la cuenta, asegurarse que el evento `CuentaAbierta` o `MesaActualizada` que se emite incluya `aliasCuenta = cuenta.NombreCliente` y `meseraActualId = cuenta.MeseraId`. Si no se emite, agregar:

```csharp
await _hub.Clients.All.SendAsync("MesaActualizada", new {
    id             = cuenta.MesaId,
    estado         = "Ocupada",
    cuentaActivaId = cuenta.Id,
    totalActual    = cuenta.Total,
    meseraActual   = cuenta.Mesera?.Nombre,
    meseraActualId = cuenta.MeseraId,
    estadoCuenta   = "Abierta",
    aliasCuenta    = cuenta.NombreCliente,
});
```

---

## PARTE B — TABLET (React)

### B.1 — `AbrirMesaModal.jsx`: enviar alias al backend

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\components\AbrirMesaModal.jsx`

Quitar la lógica de `localStorage` y enviar el alias en el body de `abrirCuenta`:

```jsx
const handleAbrir = async () => {
  const aliasFinal = (aliasMesa ?? '').trim()
  // Si la mesera no escribio nada o dejó "Mesa N", mandar null para que NO se guarde alias
  const aliasParaBackend = (!aliasFinal || aliasFinal.toLowerCase() === `mesa ${mesa.numero}`.toLowerCase())
    ? null
    : aliasFinal

  setLoading(true)
  setError(null)
  try {
    const cuenta = await api.abrirCuenta(auth.token, {
      mesaId:         mesa.id,
      meseraId:       auth.id,
      numeroPersonas: personas,
      nombreCliente:  aliasParaBackend,   // NUEVO: el alias va al backend
    })
    onExito(cuenta)
  } catch (e) {
    setError(e.message || 'No se pudo abrir la cuenta')
  } finally {
    setLoading(false)
  }
}
```

Y eliminar las funciones `aliasKey()`, `localStorage.getItem` y `localStorage.setItem`. El alias ya no se guarda local.

### B.2 — `MesasScreen.jsx`: leer alias del backend, usar `meseraActualId`

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\screens\MesasScreen.jsx`

Eliminar la función helper `getAliasMesa(mesaId)` que lee de localStorage.

En `renderMesa(mesa)`, reemplazar:
```jsx
const alias = getAliasMesa(mesa.id)
```
por:
```jsx
const alias = mesa.aliasCuenta || null
```

Para detectar el estado "PorCobrar" sin depender solo del SignalR, agregar:
```jsx
const porCobrarBackend = mesa.estadoCuenta === 'PorCobrar'
const porCobrar = porCobrarBackend || porCobrarMesas.has(mesa.id)
```

(Mantener `porCobrarMesas` para captura inmediata vía SignalR; el backend es el "estado autoritativo" cuando se hace fetch).

### B.3 — `MesasScreen.jsx`: usar `meseraActualId` para detectar "es mi mesa"

```jsx
const esMia = ocupada && (
  mesa.meseraActualId != null
    ? Number(mesa.meseraActualId) === Number(auth.id)
    : (mesa.meseraActual != null && mesa.meseraActual === auth.nombre)
)
```

(El fallback se mantiene para compatibilidad mientras coexistan binarios viejos y nuevos durante el deploy).

### B.4 — `CuentaScreen.jsx` y `ResumenCuentaScreen.jsx`: leer alias de la cuenta cargada

**Archivos:**
- `F:\BarAvenida\BarAvenida.Tablet\src\screens\CuentaScreen.jsx`
- `F:\BarAvenida\BarAvenida.Tablet\src\screens\ResumenCuentaScreen.jsx`

Reemplazar:
```jsx
const aliasMesa  = (() => { try { return localStorage.getItem(...) } catch ... })()
```
por:
```jsx
const aliasMesa  = cuenta?.nombreCliente || mesa?.aliasCuenta || null
```

Y eliminar referencias a `localStorage.mesa_alias_*`.

### B.5 — `OpcionesMesaModal.jsx`: igual

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\components\OpcionesMesaModal.jsx`

Reemplazar el `localStorage.getItem` por:
```jsx
const aliasMesa = cuenta?.nombreCliente || mesa?.aliasCuenta || null
```

### B.6 — Actualizar `api.js` para que `getCuenta` y `getCuentasAbiertas` devuelvan `nombreCliente`

Verificar en `F:\BarAvenida\BarAvenida.Tablet\src\api.js` que las llamadas a `/api/Cuentas/{id}` y `/api/Cuentas/abiertas` devuelven el `nombreCliente`. Si el DTO de respuesta lo incluye, no hay que hacer nada. Si no, agregar el campo en el DTO del backend (`CuentaDto`, `CuentaResumenDto`).

---

## PARTE C — DEPLOY (script unificado)

```powershell
# === 1. Build del backend ===
cd F:\BarAvenida\BarAvenida.API
dotnet build -c Release
if ($LASTEXITCODE -ne 0) { Write-Host "Backend build fallo" -ForegroundColor Red; exit }

# === 2. Publish del backend ===
dotnet publish -c Release -o bin\Release\net8.0\publish
if ($LASTEXITCODE -ne 0) { Write-Host "Backend publish fallo" -ForegroundColor Red; exit }

# === 3. Build de la Tablet ===
cd F:\BarAvenida\BarAvenida.Tablet
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Tablet build fallo" -ForegroundColor Red; exit }

# === 4. Detener servicio antes de reemplazar binarios ===
Stop-Service BarAvenidaAPI

# === 5. Reemplazar binario del backend en Program Files ===
$prodServer = "C:\Program Files\Bar Avenida\Server"
# Conservar wwwroot existente para no perder configuracion
$publishOutput = "F:\BarAvenida\BarAvenida.API\bin\Release\net8.0\publish"
Copy-Item -Recurse -Force "$publishOutput\*" $prodServer -Exclude wwwroot

# === 6. Copiar la nueva Tablet a las dos ubicaciones ===
$dst1 = "F:\BarAvenida\BarAvenida.API\wwwroot\tablet"
$dst2 = "C:\Program Files\Bar Avenida\Server\wwwroot\tablet"
foreach ($d in @($dst1, $dst2)) {
  Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $d -Force | Out-Null
  Copy-Item -Recurse -Force "F:\BarAvenida\BarAvenida.Tablet\dist\*" $d
}

# === 7. Iniciar servicio ===
Start-Service BarAvenidaAPI
Start-Sleep -Seconds 5

# === 8. Verificar ===
$r = Invoke-WebRequest "http://192.168.100.10:7000/tablet/" -UseBasicParsing -Headers @{"Cache-Control"="no-cache"}
$r.Content -split "`n" | Select-String "index-"
Get-Service BarAvenidaAPI | Format-Table -AutoSize

Write-Host ""
Write-Host "Smoke test:" -ForegroundColor Cyan
$body = @{ codigo = "12"; pin = "1111" } | ConvertTo-Json
try {
  $r2 = Invoke-RestMethod "http://192.168.100.10:7000/api/Auth/login" -Method POST -Body $body -ContentType "application/json"
  Write-Host "  Login OK (token len=$($r2.token.Length))" -ForegroundColor Green
} catch {
  Write-Host "  Login FAIL: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
```

---

## Validación post-deploy (lo que Coronado debe ver)

1. Login con código 12 (mesera nau) → entra al grid
2. Tappear mesa libre → modal con campo "NOMBRE DE MESA" libre → escribir "Mesa Señor" → ABRIR
3. La mesa 2 ahora muestra "MESA SEÑOR" en lugar del número
4. Solicitar cobro → modal de confirmación con monto → SI, SOLICITAR
5. La mesa 2 se vuelve **MORADA** con texto "PENDIENTE DE COBRO" + el monto
6. **En OTRA pestaña** (modo incógnito), login con código 23 (ABBY GZZ)
7. Esa otra mesera DEBE ver:
   - Mesa 2 en MORADO con "PENDIENTE DE COBRO" y "MESA SEÑOR" como nombre
   - El monto correcto
   - El nombre "nau" como mesera atendiendo
8. El admin cobra desde su pantalla → la mesa 2 vuelve a estado **LIBRE** y muestra **"2"** otra vez (sin el alias)

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migration accidental al hacer `dotnet build` | Solo build/publish, sin `dotnet ef database update`. Usar `NombreCliente` que ya existe. |
| Servicio no arranca después del reemplazo | Tener backup del binario actual antes de reemplazar. Si falla, revert. |
| SignalR group "Meseras" no recibe eventos | El frontend ya se inscribe (commit anterior). Verificar con DevTools Console. |
| Coronado pierde alias mientras se hace deploy | El campo `NombreCliente` ya existe en BD; las cuentas abiertas no se borran. |

---

## Notas para Claude Code

- **NO hacer migration EF.** Reusar `NombreCliente` existente.
- **NO tocar otros endpoints** (Auth, Catalogos, etc.).
- Después del build del backend, validar que `bin\Release\net8.0\publish\` se generó completo.
- Si encuentras que el endpoint de abrir-cuenta tiene otro nombre de DTO, adapta — pero mantén el contrato `nombreCliente`.
- Reportar al final: build sin warnings, servicio Running, smoke test del login OK.
- Si algo del spec choca con el código real, reportarlo al final en lugar de inventar.
