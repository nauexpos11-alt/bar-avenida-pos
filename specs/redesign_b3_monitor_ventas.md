# SPEC — Bloque 3: Monitor de Ventas

> **Maestro:** `specs/redesign_master.md`
> **Esfuerzo:** ~60 min
> **Impacto:** MEDIO
> **Para:** Claude Code en F:\BarAvenida

---

## 1. Origen

Soft Restaurant tiene "Monitor de Ventas" con desglose por:
- Tipo de producto (Bebidas, Alimentos, Otros, Desc/Cortesías, Impuestos)
- Tipo de servicio (Comedor, Domicilio, Rápido)
- Por área (lista con monto)
- Cuentas comedor abiertas/impresas
- Comensales abiertas/pagadas

Bar Avenida ya tiene `DashboardLiveScreen` (KPIs + ventas por hora) y `InformeDiaScreen` (resumen ejecutivo). Este bloque agrega un **Monitor de Ventas dedicado** que complementa con desgloses específicos por categoría/servicio/área.

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 MONITOR DE VENTAS                  [Hoy] [Ayer] [Semana] [Mes] [Turno]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ VENTA TOTAL DEL DÍA                                                          │
│ $40,081.00       ▲ 12% vs ayer       71 cuentas pagadas                     │
│                                                                              │
│ ┌─── POR TIPO DE PRODUCTO ─────┐  ┌─── POR TIPO DE SERVICIO ────────┐       │
│ │  ████████████████ 97%        │  │  ████████████ 78%                │       │
│ │  Bebidas      $38,916        │  │  Mesa (Comedor)  $31,142          │       │
│ │  ██ 3%                       │  │  ████ 22%                         │       │
│ │  Otros         $1,165        │  │  Barra (Rápido)  $8,939           │       │
│ └──────────────────────────────┘  └──────────────────────────────────┘       │
│                                                                              │
│ POR ÁREA                                                                     │
│ ┌──────────┬──────────┬──────────┬──────────┐                                │
│ │ COMEDOR  │ TERRAZA  │ PRIVADO  │ BARRA    │                                │
│ │ $24,500  │ $4,200   │ $2,442   │ $8,939   │                                │
│ │ 61%      │ 11%      │ 6%       │ 22%      │                                │
│ │ 42 ctas  │ 8 ctas   │ 4 ctas   │ 17 ctas  │                                │
│ └──────────┴──────────┴──────────┴──────────┘                                │
│                                                                              │
│ POR CATEGORÍA DE PRODUCTO                                                    │
│ ┌────────────┬────────┬─────┐                                                │
│ │ Categoría  │ Monto  │  %  │                                                │
│ ├────────────┼────────┼─────┤                                                │
│ │ Cervezas   │$15,400 │ 38% │ ████████████████                               │
│ │ Tequilas   │$10,200 │ 25% │ ███████████                                    │
│ │ Whiskys    │ $5,600 │ 14% │ ██████                                         │
│ │ Preparados │ $3,800 │  9% │ ████                                           │
│ │ Mezcal     │ $2,200 │  5% │ ██                                             │
│ │ Otros      │ $2,881 │  7% │ ███                                            │
│ └────────────┴────────┴─────┘                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Endpoint backend (NUEVO)

`GET /api/admin/monitor-ventas?periodo=hoy|ayer|semana|mes|turno`

```json
{
  "periodo": "hoy",
  "rangoFechas": { "desde": "2026-05-08T00:00:00", "hasta": "2026-05-08T23:59:59" },
  "ventaTotal": 40081.00,
  "deltaVsAyer": 12.5,
  "cuentasPagadas": 71,

  "porTipoProducto": [
    { "tipo": "Bebidas", "monto": 38916.00, "porcentaje": 97.1 },
    { "tipo": "Otros", "monto": 1165.00, "porcentaje": 2.9 }
  ],

  "porTipoServicio": [
    { "tipo": "Mesa", "monto": 31142.00, "porcentaje": 77.7, "cuentas": 54 },
    { "tipo": "Barra", "monto": 8939.00, "porcentaje": 22.3, "cuentas": 17 }
  ],

  "porArea": [
    { "area": "COMEDOR", "monto": 24500.00, "porcentaje": 61.1, "cuentas": 42 },
    { "area": "BARRA", "monto": 8939.00, "porcentaje": 22.3, "cuentas": 17 },
    { "area": "TERRAZA", "monto": 4200.00, "porcentaje": 10.5, "cuentas": 8 },
    { "area": "PRIVADO", "monto": 2442.00, "porcentaje": 6.1, "cuentas": 4 }
  ],

  "porCategoria": [
    { "categoria": "Cervezas", "monto": 15400.00, "porcentaje": 38.4 },
    { "categoria": "Tequilas", "monto": 10200.00, "porcentaje": 25.4 },
    { "categoria": "Whiskys", "monto": 5600.00, "porcentaje": 14.0 },
    { "categoria": "Preparados", "monto": 3800.00, "porcentaje": 9.5 },
    { "categoria": "Mezcal", "monto": 2200.00, "porcentaje": 5.5 },
    { "categoria": "Otros", "monto": 2881.00, "porcentaje": 7.2 }
  ]
}
```

### Implementación
- En `AdminController.cs` o crear `MonitorVentasController.cs`
- Solo cuentas con `Estado="Cobrada"` en el rango de fechas
- "Tipo de producto": derivar del `Categoria.Tipo` (campo nuevo opcional, o por defecto "Bebidas" para todo lo que no sea "Botanas/Cigarros/etc")
  - **Simplificación:** asumir TODO es "Bebidas" excepto si la categoría tiene nombre que coincide con "Botanas", "Cigarros", "Otros" → "Otros"
- "Tipo de servicio": `MesaId IS NULL` → "Barra", else "Mesa"
- "Por área": agrupar por `Cuenta.Area`
- "Por categoría": agrupar por `Producto.Categoria.Nombre`

---

## 4. Frontend

### Crear
- `BarAvenida.Admin/src/screens/MonitorVentasScreen.jsx` (~250 líneas)
- `BarAvenida.Admin/src/screens/MonitorVentasScreen.css` (~180 líneas)

### Modificar
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` — agregar en sección `admin`, dentro del hub `Reportes`:
  ```js
  { label: 'Monitor de Ventas', screen: 'rep-monitor-ventas' },
  ```
- `BarAvenida.Admin/src/App.jsx` — agregar `case 'rep-monitor-ventas'`

### Componentes visuales
- Usar **recharts** (ya instalado) para las barras de progreso horizontales:
  - Por tipo producto / servicio: `BarChart` horizontal con 2-3 datos
  - Por área: 4 cards con monto + barra mini
  - Por categoría: tabla con barra inline
- Selector de período arriba (botones tipo "tabs"): `Hoy` / `Ayer` / `Semana` / `Mes` / `Turno`

---

## 5. Builds y validación

- `dotnet build` → 0/0
- `npm run build` Admin → 0/0
- Deploy con `Scripts\deploy-todo.ps1`

### Caso A
1. Login → REPORTES → Monitor de Ventas.
2. Pantalla muestra desgloses correctos.
3. Comparar con `Cuentas WHERE Estado='Cobrada' AND FechaCobro IN [hoy]` por SQL para validar.

### Caso B
1. Cambiar selector a "Ayer" → datos cambian.
2. Cambiar a "Semana" → datos acumulan 7 días.

### Caso C
1. Pantalla abierta en admin.
2. Mesera (otra tab) cobra una cuenta nueva.
3. Monitor refresca con auto-poll de 30s o SignalR `CuentaCobrada`.

---

## 6. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b3_monitor_ventas.md y impleméntalo completo.
Reporta archivos modificados, builds y los 3 casos validados.
```
