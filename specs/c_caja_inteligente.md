# SPEC C — Caja Inteligente (Fase 1)

> **Estado:** SPEC FINAL — listo para implementar
> **Decisiones tomadas:** Cowork (Mayo 6, 2026), pendiente aprobación de Coronado
> **Pre-requisito:** Fase 0 cerrada ✅
> **Tiempo estimado:** 2-3 sesiones de Claude Code
> **Sub-specs implementables:** `c1_sugerencia_fondo.md`, `c2_alertas_activas.md`, `c3_cierre_asistido.md`

---

## 1. Visión

Convertir la caja del Bar Avenida de un sistema **manual y reactivo** a un sistema
**proactivo y asistido**: que sugiere acciones, detecta anomalías y guía al admin
para que el cierre sea limpio y rápido. Tres entregables independientes que se
pueden implementar en sesiones separadas.

## 2. Decisiones tomadas (con razonamiento)

### Decisión 1 — Umbrales por defecto

| Umbral | Valor | Razón |
|---|---|---|
| **Cajón con efectivo** | > $5,000 → alerta de retiro | Tickets promedio ~$200 → 25 cuentas en efectivo es riesgo razonable de acumular |
| **Tiempo sin corte X** | > 4h → sugerir corte parcial | Turnos de 6-8h, un corte intermedio da visibilidad sin interrumpir |
| **Diferencia VERDE** | ±$50 | Error típico de cambio (una moneda mal contada) |
| **Diferencia AMARILLA** | ±$50 a ±$200 | Justifica revisión, no es crítica |
| **Diferencia ROJA** | > $200 | Algo serio, requiere explicación |

### Decisión 2 — Configurabilidad

**Hardcoded en `appsettings.json` del backend** al principio. Sección `Caja:Umbrales` con las 3 constantes. Razón: MVP simple. Cambiar valores no requiere recompilar — solo editar JSON y reiniciar el backend. UI configurable se mete en iteración futura SOLO si los umbrales cambian con frecuencia (probablemente no, son valores estructurales del bar).

### Decisión 3 — Justificación obligatoria si diferencia ROJA

**SÍ es obligatoria.** El backend rechaza `POST /api/Caja/cierre-asistido` con HTTP 400 si `Math.Abs(diferencia) > $200` y `justificacion` está vacío o null. El frontend muestra un textarea obligatorio cuando detecta diferencia roja. Razón: si no obligas, nadie escribe nada y después no sabes por qué falta dinero.

### Decisión 4 — UI de alertas activas

**Badge amarillo en `TopMenuBar`** (mismo patrón que el rojo de B3, color distinto). Click abre **drawer lateral derecho** con lista de alertas activas; no hay modal bloqueante. Cada alerta tiene: ícono de tipo, mensaje, botón de acción sugerida ("Hacer retiro", "Iniciar corte X"). Razón: consistencia con B3, no interrumpe el flujo, drawer permite ver detalles sin perder contexto.

### Decisión 5 — Histórico de incidentes

**Tab nuevo dentro de `CortesCajaScreen`** con clave `tab='incidentes'`. La pantalla ya soporta tabs (`x`, `z`, `historico`); agregar uno más es trivial. Razón: los incidentes son parte del workflow de caja, mantenerlos en la misma pantalla evita inflar el menú principal.

## 3. Estructura de los 3 sub-bloques

```
PROMPT C
├── C.1 — Sugerencia de fondo de caja
│   ├── Backend: GET /api/Caja/sugerencia-fondo
│   ├── Frontend: hint en TurnoCajaScreen al abrir turno
│   └── 1 sesión chica (~1.5h Claude Code)
│
├── C.2 — Alertas activas en tiempo real
│   ├── Backend: detector + SignalR event "AlertaCaja"
│   ├── Frontend: badge amarillo TopMenuBar + AlertasDrawer
│   └── 1 sesión mediana (~3h Claude Code)
│
└── C.3 — Cierre asistido + IncidentesCaja
    ├── Backend: modelo + migración EF + endpoint cierre-asistido
    ├── Frontend: modal con código de color + tab Incidentes
    └── 1 sesión grande (~4h Claude Code)
```

## 4. Configuración del backend (appsettings.json)

Agregar sección al final de `appsettings.json`:

```json
"Caja": {
  "Umbrales": {
    "CajonMaximoEfectivo": 5000,
    "HorasSinCorteX": 4,
    "DiferenciaVerde": 50,
    "DiferenciaAmarilla": 200
  },
  "FondoSugerido": {
    "DiasHistorial": 7,
    "MismoDiaSemana": true
  }
}
```

Bind a una clase `CajaSettings.cs` en el namespace `BarAvenida.API.Settings`. Inyectar via `IOptions<CajaSettings>` en los servicios que la necesiten.

## 5. Cambios al modelo de datos

### Nueva tabla: `IncidentesCaja`

```csharp
namespace BarAvenida.API.Models;

public class IncidenteCaja
{
    public int Id { get; set; }

    public int TurnoId { get; set; }
    public Turno? Turno { get; set; }

    public int? CorteId { get; set; }
    public Corte? Corte { get; set; }

    [Required, MaxLength(20)]
    public string Tipo { get; set; } = ""; // "Sobrante" | "Faltante" | "Anomalia"

    [Required, MaxLength(20)]
    public string Severidad { get; set; } = ""; // "Verde" | "Amarilla" | "Roja"

    public decimal Diferencia { get; set; } // positivo = sobrante, negativo = faltante
    public decimal EfectivoEsperado { get; set; }
    public decimal EfectivoContado { get; set; }

    [MaxLength(500)]
    public string? Justificacion { get; set; }

    public int? AutorizadoPorId { get; set; }
    public Usuario? AutorizadoPor { get; set; }

    public DateTime FechaRegistro { get; set; } = DateTime.Now;
}
```

### Migración EF

```powershell
cd F:\BarAvenida\BarAvenida.API
dotnet ef migrations add IncidentesCaja
dotnet ef database update
```

### DbContext

Agregar `DbSet<IncidenteCaja> IncidentesCaja { get; set; }` y configurar FKs con `OnDelete(DeleteBehavior.NoAction)` para evitar ciclos de cascada (mismo patrón que `SolicitudCancelacion`).

## 6. Roadmap sugerido

**Sesión 1 — C.1** (chica, sin migración)
- Implementar `GET /api/Caja/sugerencia-fondo`
- Hint en `TurnoCajaScreen` con botón "Usar recomendado"
- Build + validación rápida

**Sesión 2 — C.2** (mediana, sin migración)
- Service `DetectorAlertasCaja` que corre cada minuto (BackgroundService) o se dispara con eventos
- Evento SignalR `AlertaCaja` con payload `{ tipo, severidad, mensaje, accion, contexto }`
- Componente `AlertasDrawer.jsx` + integración en `TopMenuBar.jsx`
- Build + validación con apps corriendo

**Sesión 3 — C.3** (grande, con migración)
- Modelo `IncidenteCaja` + migración + DbContext
- Endpoint `POST /api/Caja/cierre-asistido` con validaciones
- Refactor de `CortesCajaScreen.jsx` para nuevo tab "Incidentes"
- Modal de cierre asistido con código de color y textarea condicional
- Build + validación end-to-end

## 7. Reglas de oro

- 0 errors, 0 warnings en cada build (mismo nivel que Fase 0).
- Migración EF aplicada con `dotnet ef migrations add IncidentesCaja` + `dotnet ef database update`.
- NO instalar librerías nuevas (recharts ya está disponible si necesitamos gráficas).
- Conservar archivos JSX/CSS aunque queden sin uso.
- Antes de cada sesión grande: `taskkill /F /IM BarAvenida.API.exe /T`.
- Si truena MSB4018 cache: ver troubleshooting en CLAUDE.md.

## 8. Criterios de aceptación globales

- [ ] Al abrir turno, el admin ve sugerencia de fondo basada en histórico.
- [ ] Cuando sube efectivo en cajón sobre el umbral, aparece alerta amarilla en TopMenuBar.
- [ ] Cuando pasan 4h sin corte X, alerta sugiere corte parcial.
- [ ] Al hacer Corte Z asistido, se muestra diferencia con código de color (verde/amarillo/rojo).
- [ ] Diferencia roja BLOQUEA el cierre hasta que se escriba justificación de mínimo 10 caracteres.
- [ ] Tabla `IncidentesCaja` se llena automáticamente cuando hay diferencia ≠ 0.
- [ ] Tab "Incidentes" en CortesCajaScreen permite consultar histórico filtrado por fecha.
- [ ] 4 builds finales en 0/0 (Backend, Admin, Tablet, KDS aunque no se toque).
- [ ] Validación end-to-end documentada en `c_validacion.md` post-implementación.

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Migración EF rompe datos existentes | Baja | Hacer backup de SQL antes; campo `IncidentesCaja` es tabla nueva, no altera otras |
| BackgroundService impacta performance | Baja | Correr cada 60s, queries con índices, leer solo turnos activos |
| Alertas falsas en período de cierre | Media | Suprimir alertas cuando se está en flujo activo de Corte Z |
| Histórico de incidentes crece sin límite | Media | Agregar paginación al endpoint desde el día 1 |

## 10. Notas para Coronado

- Si los **umbrales por defecto no te cuadran** (ej: tu bar maneja más efectivo y prefieres $10K antes de alertar), edítalos aquí en este spec antes de pasar a Claude Code y los ajusto.
- Si prefieres **histórico de incidentes en pantalla nueva** en vez de tab, también editas aquí y reescribo C.3.
- Si **NO quieres justificación obligatoria** (solo sugerida), también editable. Mi voto fuerte es que sí sea obligatoria.

Cuando aprueben este spec, los sub-specs `c1_*`, `c2_*`, `c3_*` están listos para entregar a Claude Code uno por uno.
