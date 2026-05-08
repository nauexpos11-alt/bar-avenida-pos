# SPEC C.1 — Sugerencia de fondo de caja

> **Tipo:** Sub-spec implementable de PROMPT C
> **Sesión estimada:** 1.5h Claude Code
> **Sin migración EF**, sin librerías nuevas
> **Pre-requisito:** spec maestro `c_caja_inteligente.md` aprobado

---

## 1. Objetivo

Cuando el admin abre un nuevo turno, el sistema le sugiere un fondo de caja
basado en el histórico de los últimos 7 días (preferentemente el mismo día de
la semana). El admin ve un hint debajo del input de "monto inicial" con la
recomendación + justificación, y un botón "Usar recomendado" para auto-llenar.

## 2. Backend

### Settings

En `appsettings.json` agregar:
```json
"Caja": {
  "FondoSugerido": {
    "DiasHistorial": 7,
    "MismoDiaSemana": true
  }
}
```

Crear `BarAvenida.API/Settings/CajaSettings.cs`:
```csharp
namespace BarAvenida.API.Settings;

public class CajaSettings
{
    public FondoSugeridoSettings FondoSugerido { get; set; } = new();
}

public class FondoSugeridoSettings
{
    public int DiasHistorial { get; set; } = 7;
    public bool MismoDiaSemana { get; set; } = true;
}
```

Registrar en `Program.cs`:
```csharp
builder.Services.Configure<CajaSettings>(builder.Configuration.GetSection("Caja"));
```

### DTO

`BarAvenida.API/DTOs/SugerenciaFondoDto.cs`:
```csharp
namespace BarAvenida.API.DTOs;

public class SugerenciaFondoDto
{
    public decimal Recomendado { get; set; }
    public decimal MinimoHistorico { get; set; }
    public decimal MaximoHistorico { get; set; }
    public int TurnosAnalizados { get; set; }
    public string Justificacion { get; set; } = "";
}
```

### Endpoint

Agregar a `CajaController.cs`:
```csharp
// GET /api/Caja/sugerencia-fondo
[HttpGet("sugerencia-fondo")]
public async Task<IActionResult> GetSugerenciaFondo([FromServices] IOptions<CajaSettings> opts)
{
    var cfg      = opts.Value.FondoSugerido;
    var hoy      = DateTime.Today;
    var desde    = hoy.AddDays(-cfg.DiasHistorial);
    var diaActual = hoy.DayOfWeek;

    // Traer turnos cerrados del rango
    var turnos = await _context.Turnos
        .Where(t => t.FechaApertura >= desde &&
                    t.FechaCierre   != null &&
                    t.FondoInicial   > 0)
        .ToListAsync();

    // Si MismoDiaSemana = true, filtrar por día de la semana
    if (cfg.MismoDiaSemana) {
        turnos = turnos
            .Where(t => t.FechaApertura.DayOfWeek == diaActual)
            .ToList();
    }

    if (turnos.Count == 0) {
        return Ok(new SugerenciaFondoDto {
            Recomendado     = 0,
            TurnosAnalizados = 0,
            Justificacion    = "Sin histórico suficiente. Define un monto manual."
        });
    }

    // Promedio redondeado a múltiplos de $50
    var promedio = turnos.Average(t => t.FondoInicial);
    var redondeado = Math.Round(promedio / 50m) * 50m;

    var dto = new SugerenciaFondoDto {
        Recomendado     = redondeado,
        MinimoHistorico = turnos.Min(t => t.FondoInicial),
        MaximoHistorico = turnos.Max(t => t.FondoInicial),
        TurnosAnalizados = turnos.Count,
    };

    var dia = cfg.MismoDiaSemana
        ? diaActual.ToString().ToLower() + "s"
        : "días";
    dto.Justificacion = $"Basado en {turnos.Count} {dia} previos " +
                        $"(rango ${dto.MinimoHistorico:N0}–${dto.MaximoHistorico:N0}).";

    return Ok(dto);
}
```

## 3. Frontend (Admin)

### api.js

Agregar:
```javascript
adminGetSugerenciaFondo: (t) => req('/api/Caja/sugerencia-fondo', {}, t),
```

### TurnoCajaScreen.jsx

Antes del input de "monto inicial", agregar componente que:
1. Al montar el screen, llama a `api.adminGetSugerenciaFondo(auth.token)`.
2. Si `recomendado > 0`, muestra hint dorado con el valor y justificación.
3. Botón "Usar recomendado" auto-llena el input con el valor.
4. Si `recomendado === 0`, muestra mensaje gris "Sin histórico suficiente".

Patrón visual (tema dorado/negro):
```jsx
{sugerencia && sugerencia.recomendado > 0 && (
  <div className="tc-hint-fondo">
    <div className="tc-hint-row">
      <span className="tc-hint-icon">💡</span>
      <span className="tc-hint-label">RECOMENDADO</span>
      <span className="tc-hint-monto">${sugerencia.recomendado.toLocaleString('es-MX')}</span>
      <button
        type="button"
        className="tc-hint-btn"
        onClick={() => setMontoInicial(sugerencia.recomendado)}
      >
        USAR
      </button>
    </div>
    <div className="tc-hint-just">{sugerencia.justificacion}</div>
  </div>
)}
```

CSS mínimo (mismo color palette que B3):
- Borde `#a0820d` 1px, fondo `#1a1500`, padding 10px, border-radius 6px
- `tc-hint-monto` color `#f0c842`, font-weight 900, font-size 1.2rem
- `tc-hint-btn` background `#f0c842`, color `#000`, border-radius 4px, padding 4px 10px

## 4. Criterios de aceptación

- [ ] Endpoint `/api/Caja/sugerencia-fondo` retorna `SugerenciaFondoDto` correcto.
- [ ] Si no hay histórico, `recomendado=0` y mensaje claro.
- [ ] Si hay histórico, valor redondeado a múltiplos de $50.
- [ ] Hint visible en `TurnoCajaScreen` con tema dorado consistente.
- [ ] Botón "Usar recomendado" llena el input correctamente.
- [ ] Justificación incluye número de turnos analizados.
- [ ] Build Admin + Backend en **0/0**.

## 5. Pruebas manuales rápidas

1. Antes de tener turnos previos: abrir Caja → Apertura de turno → ver mensaje "Sin histórico suficiente".
2. Cerrar al menos 2 turnos cualquier día → repetir → ver hint con monto sugerido.
3. Click "USAR" → input se llena con el monto recomendado.
4. Modificar manualmente → guardar → verificar que se usa el valor manual.

## 6. Archivos modificados

| Archivo | Acción | Líneas aprox |
|---|---|---|
| `appsettings.json` | Modificar (agregar sección) | +9 |
| `Settings/CajaSettings.cs` | NUEVO | ~15 |
| `Program.cs` | Modificar (1 línea) | +1 |
| `Controllers/CajaController.cs` | Modificar (endpoint nuevo) | +50 |
| `DTOs/SugerenciaFondoDto.cs` | NUEVO | ~12 |
| `BarAvenida.Admin/src/api.js` | Modificar (1 método) | +1 |
| `BarAvenida.Admin/src/screens/TurnoCajaScreen.jsx` | Modificar | +30 |
| `BarAvenida.Admin/src/screens/TurnoCajaScreen.css` | Modificar | +25 |

**Total: ~140 líneas, 4 archivos nuevos.**
