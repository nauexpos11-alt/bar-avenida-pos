# SPEC H — Anti-fuga (Alerta de mesas inactivas)

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork con nombres reales del proyecto
> **Pre-requisito:** C.2 ✅ implementado y validado (reusa toda su infraestructura)
> **Sin migración EF**, sin librerías nuevas
> **Sesión estimada:** 1.5h Claude Code

---

## 1. Objetivo

Detectar mesas **abiertas que llevan demasiado tiempo sin actividad** (sin
nuevas órdenes), que son sospechosas de "fuga" (cliente que se va sin pagar,
o cuenta olvidada). Cuando se detecta, emitir una alerta que aparece en el
mismo `AlertasDrawer` del admin que ya construimos en C.2.

**Caso de uso real:** un cliente pidió 2 cervezas hace 45 minutos, ya no ha
pedido nada y sigue ahí. La mesera puede haber olvidado pasar a verlos. El
admin recibe la alerta, va a la mesa o llama a la mesera, y previene que se
vayan sin pagar.

## 2. Decisión arquitectónica

**NO crear servicio nuevo.** Extender el `DetectorAlertasCaja` que ya corre
cada minuto desde C.2. Solo agregar un método `EvaluarMesasInactivas` al
ciclo de detección.

**NO tocar el frontend estructuralmente.** El `AlertasDrawer` ya renderiza
cualquier alerta que llegue por SignalR. Solo agregar el caso "MesaInactiva"
al switch de `tituloTipo` para que se vea bonito.

## 3. Backend — cambios

### 3.1 Settings

En `F:\BarAvenida\BarAvenida.API\Settings\CajaSettings.cs`, agregar campo a
`UmbralesSettings`:

```csharp
public class UmbralesSettings
{
    public decimal CajonMaximoEfectivo { get; set; } = 5000;
    public int     HorasSinCorteX      { get; set; } = 4;
    public decimal DiferenciaVerde     { get; set; } = 50;
    public decimal DiferenciaAmarilla  { get; set; } = 200;

    // PROMPT H — Anti-fuga
    public int MinutosSinActividadMesa { get; set; } = 30;
}
```

En `F:\BarAvenida\BarAvenida.API\appsettings.json`, dentro de `Caja.Umbrales`:

```json
"Umbrales": {
  "CajonMaximoEfectivo": 5000,
  "HorasSinCorteX": 4,
  "DiferenciaVerde": 50,
  "DiferenciaAmarilla": 200,
  "MinutosSinActividadMesa": 30
}
```

### 3.2 DetectorAlertasCaja

En `F:\BarAvenida\BarAvenida.API\Services\DetectorAlertasCaja.cs`:

**Modificar `DetectarAsync`** para llamar al nuevo método siempre (no requiere turno activo):

```csharp
private async Task DetectarAsync(CancellationToken ct)
{
    using var scope = _sp.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();

    // PROMPT H — Mesas inactivas (corre siempre, no requiere turno de caja activo)
    await EvaluarMesasInactivas(db, ct);

    // Las demás reglas requieren turno activo
    var turno = await db.CajaTurnos
        .Where(t => t.Estado == "Abierto")
        .OrderByDescending(t => t.FechaApertura)
        .FirstOrDefaultAsync(ct);

    if (turno == null)
    {
        // ... (código existente sin cambios)
    }
    // ... (resto del código existente)
}
```

**Agregar el método nuevo `EvaluarMesasInactivas`** al final del archivo:

```csharp
private async Task EvaluarMesasInactivas(BarAvenidaDbContext db, CancellationToken ct)
{
    var ahora    = DateTime.Now;
    var umbral   = _umbrales.MinutosSinActividadMesa;
    var corteRef = ahora.AddMinutes(-umbral);

    // Cuentas abiertas con su última actividad (orden más reciente o apertura)
    var cuentas = await db.Cuentas
        .Where(c => c.Estado == "Abierta")
        .Include(c => c.Mesa)
        .Include(c => c.Mesera)
        .Include(c => c.Ordenes)
        .ToListAsync(ct);

    var mesasActualmenteInactivas = new HashSet<int>();

    foreach (var c in cuentas)
    {
        var ultimaActividad = c.Ordenes.Any()
            ? c.Ordenes.Max(o => o.FechaEnvio)
            : c.FechaApertura;

        if (ultimaActividad > corteRef) continue; // todavía dentro de tolerancia

        var minutos = (int)(ahora - ultimaActividad).TotalMinutes;
        var key     = $"mesa-inactiva-{c.Id}";
        mesasActualmenteInactivas.Add(c.Id);

        if (_alertasEmitidas.ContainsKey(key)) continue; // ya emitida

        var alerta = new AlertaCajaDto
        {
            Tipo            = "MesaInactiva",
            Severidad       = "Amarilla",
            Mensaje         = $"Mesa {c.Mesa?.Numero ?? c.MesaId} ({c.Mesera?.Nombre ?? "?"}) " +
                              $"lleva {minutos} min sin actividad. Total: ${c.Total:N0}.",
            AccionSugerida  = "Ver mesas",
            AccionScreen    = "dashboard",
        };
        await EmitirAlerta(alerta);
        _alertasEmitidas[key] = alerta.Id;
    }

    // Limpiar keys de mesas que YA NO están inactivas (cerraron, agregaron orden, etc)
    var keysObsoletas = _alertasEmitidas.Keys
        .Where(k => k.StartsWith("mesa-inactiva-"))
        .Where(k => {
            var idStr = k.Replace("mesa-inactiva-", "");
            return int.TryParse(idStr, out var id) && !mesasActualmenteInactivas.Contains(id);
        })
        .ToList();

    foreach (var k in keysObsoletas) _alertasEmitidas.Remove(k);
}
```

**Importante:** este método no depende de turno activo. Si no hay turno
abierto pero hay cuentas operando (excepción rara), igual queremos detectar
mesas olvidadas.

## 4. Frontend — cambios

### 4.1 `AlertasDrawer.jsx`

En `F:\BarAvenida\BarAvenida.Admin\src\components\AlertasDrawer.jsx`, modificar
la función `tituloTipo`:

```javascript
function tituloTipo(tipo) {
  switch (tipo) {
    case 'EfectivoExcesivo': return '💵 Efectivo en cajón'
    case 'TiempoSinCorteX':  return '⏱ Tiempo sin corte'
    case 'MesaInactiva':     return '🚪 Mesa inactiva'
    case 'Anomalia':         return '🔍 Anomalía detectada'
    default:                 return '⚠ Alerta'
  }
}
```

**No se requiere** ningún cambio CSS — el card amarillo ya está estilizado
en `AlertasDrawer.css` y el comportamiento (botón "Ver mesas → dashboard") ya
funciona con el wiring de `onIrPantalla`.

## 5. Criterios de aceptación

### Backend
- [ ] `Caja:Umbrales:MinutosSinActividadMesa` cargado en `appsettings.json` (default 30).
- [ ] `EvaluarMesasInactivas` corre cada ciclo del `DetectorAlertasCaja`.
- [ ] Detecta cuentas con `Estado="Abierta"` y última `Orden.FechaEnvio` (o `FechaApertura` si no hay órdenes) > umbral.
- [ ] Emite `AlertaCaja` con `Tipo="MesaInactiva"` al grupo Admin.
- [ ] Mensaje incluye número de mesa, mesera, minutos de inactividad, total acumulado.
- [ ] Deduplicación por `mesa-inactiva-{cuentaId}`.
- [ ] Cuando una mesa deja de estar inactiva (recibe nueva orden o se cobra) → la key se limpia para permitir emitir de nuevo si reaparece.
- [ ] **Build backend en 0/0**.

### Frontend
- [ ] Icono `🚪` y título "Mesa inactiva" en card del drawer.
- [ ] Card amarilla (igual estilo que C.2).
- [ ] Botón "Ver mesas →" navega al dashboard (donde el admin ve grid de mesas).
- [ ] **Build admin en 0/0**.

## 6. Pruebas manuales (después de implementar)

**Setup:**
1. Bajar temporalmente `MinutosSinActividadMesa` a `1` en `appsettings.json`.
2. Reiniciar backend.
3. Login en Tablet con mesera ABBY (`23/0001`).

**Caso 1 — Mesa inactiva con órdenes:**
1. Tablet: abrir Mesa 1, agregar 1 producto, mandar al KDS.
2. Esperar ~75 segundos sin tocar nada.
3. Admin: aparece botón ⚠ con badge "1".
4. Click → drawer muestra card "🚪 Mesa inactiva — Mesa 1 (ABBY GZZ) lleva 1 min sin actividad. Total: $40."
5. Click "Ver mesas →" → navega al dashboard.

**Caso 2 — Mesa inactiva sin órdenes (solo apertura):**
1. Tablet: abrir Mesa 2 sin agregar productos.
2. Esperar ~75 segundos.
3. Admin: aparece otra alerta para Mesa 2 con `Total: $0`.

**Caso 3 — Mesa que deja de estar inactiva:**
1. Con Caso 1 disparada, en Tablet agregar un producto nuevo a Mesa 1 y mandar al KDS.
2. Esperar 60 segundos (siguiente ciclo del detector).
3. La key interna se limpia. Si la mesa vuelve a estar inactiva 1 min después, se emite alerta NUEVA (no es la misma).

**Cleanup:**
- Restaurar `MinutosSinActividadMesa: 30` en `appsettings.json`.
- Reiniciar backend.

## 7. Reglas de oro

- **NO** instalar librerías nuevas.
- **NO** ejecutar `dotnet run` ni `npm run dev`.
- Antes de modificar el backend: `taskkill /F /IM BarAvenida.API.exe /T`.
- Si truena MSB4018: `Remove-Item -Recurse -Force bin, obj` y rebuild.
- Builds finales en **0 errors, 0 warnings**.
- Conservar archivos JSX/CSS aunque queden sin uso.
- Cuando termines, reportar:
  - Lista de archivos modificados
  - Resultado de los builds
  - Cualquier decisión de diseño tomada

## 8. Archivos esperados (resumen)

| Archivo | Acción | Aprox |
|---|---|---|
| `Settings/CajaSettings.cs` | Modificar (+1 campo) | +2 líneas |
| `appsettings.json` | Modificar (+1 línea en Umbrales) | +1 línea |
| `Services/DetectorAlertasCaja.cs` | Modificar (+ método nuevo + llamada) | +60 líneas |
| `BarAvenida.Admin/src/components/AlertasDrawer.jsx` | Modificar (+1 case en switch) | +1 línea |

**Total: ~64 líneas, 0 archivos nuevos, 0 librerías, 0 migraciones.** Es el bloque más chico de toda la sesión.
