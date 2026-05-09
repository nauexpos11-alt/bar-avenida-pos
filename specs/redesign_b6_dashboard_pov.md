# SPEC — Bloque 6: Dashboard de Punto de Venta

> **Maestro:** `specs/redesign_master.md`
> **Esfuerzo:** ~30 min
> **Impacto:** MEDIO (UX entrada)
> **Para:** Claude Code en F:\BarAvenida

---

## 1. Origen

Soft Restaurant 8.1.0 tiene una pantalla "PTO. DE VENTA" con 4 botones grandes:
COMEDOR (F7), DOMICILIO (F8), RAPIDO (F9), RETIRO/DEPOSITO, CONSULTAR CTAS (F5),
ABRIR TURNO (F2), CERRAR TURNO (F3), MONITOR VENTAS, CORTE CAJA X.

Bar Avenida no tiene "domicilio". Vamos a hacer un **Dashboard limpio** con 4 botones grandes que sí usan.

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bienvenido Coronado · 8/may/2026 · Turno abierto desde 18:00 · $1,500       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│   │       🎯                │    │       🍺                │                 │
│   │   CENTRO DE OPERACIÓN   │    │       BARRA             │                 │
│   │   ────────────────      │    │   ────────────────      │                 │
│   │   16 cuentas activas    │    │   3 abiertas            │                 │
│   │   $12,847 en mesas       │    │   $450 en barra          │                 │
│   │                          │    │                          │                 │
│   │   F7                     │    │   F9                     │                 │
│   └─────────────────────────┘    └─────────────────────────┘                 │
│                                                                              │
│   ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│   │       💰                │    │       📊                │                 │
│   │       CAJA              │    │   REPORTES              │                 │
│   │   ────────────────      │    │   ────────────────      │                 │
│   │   Efectivo: $5,847       │    │   Ventas hoy: $40,081   │                 │
│   │   Turno abierto 4h        │    │   ▲ 12% vs ayer         │                 │
│   │                          │    │                          │                 │
│   │   F2 / F6                │    │                          │                 │
│   └─────────────────────────┘    └─────────────────────────┘                 │
│                                                                              │
│   ⚠ 3 solicitudes pendientes · 2 alertas activas                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Botones gigantes** (50% × 50% del viewport menos header), borde dorado en hover, click → navega a la pantalla.

---

## 3. Comportamiento

### 3.1. Datos en cada botón
Llamadas a endpoints existentes para mostrar info en vivo:

| Botón | Llamada | Mostrar |
|---|---|---|
| Centro de Operación | `GET /api/Cuentas/abiertas` | count + suma totales |
| Barra | `GET /api/Cuentas/rapidas-abiertas` | count + suma totales |
| Caja | `GET /api/Caja/turno-actual` | efectivo en caja + duración del turno |
| Reportes | `GET /api/admin/dashboard/live` | ventas hoy + delta % vs ayer |

Auto-refresh cada 30s o por SignalR (`CuentaCobrada`, `CuentaAbierta`).

### 3.2. Navegación
- Click Centro → `pos-centro` (Bloque 1)
- Click Barra → `pos-barra` (Bloque 2)
- Click Caja → `caja-turno-actual`
- Click Reportes → `rep-dashboard-live` (existente)

### 3.3. Footer
- `<N> solicitudes pendientes` — click → `solicitudes-pendientes`
- `<N> alertas activas` — click abre `AlertasDrawer` existente

### 3.4. Header
- `Bienvenido <nombre>` — del `auth.nombre`
- Fecha actual del servidor (hook `useServerClock`)
- Estado del turno: "Turno abierto desde HH:MM · $<fondo inicial>" o "Turno cerrado"

---

## 4. Archivos a crear / modificar

### Crear
- `BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.jsx` (~180 líneas)
- `BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.css` (~150 líneas)

### Modificar
- `BarAvenida.Admin/src/App.jsx`:
  - Agregar import + `case 'pos-home'`
  - Cambiar default `pantallaActual` de `'pos-mesas'` (o `'pos-centro'` del B1) a `'pos-home'` SOLO si Coronado prefiere Dashboard primero. Si no, dejar Centro de Operación como default y este Dashboard se accede por un botón "Inicio" en el TopMenuBar.
- `BarAvenida.Admin/src/components/TopMenuBar.jsx`:
  - Logo del bar (esquina izquierda) → click navega a `pos-home`
  - Opcional: agregar item `🏠 Inicio` en sección `pos`

---

## 5. Builds y validación

- `npm run build` Admin → 0/0
- Deploy con `Scripts\deploy-admin.ps1`

### Caso A
1. Login → ve Dashboard PoV con 4 botones grandes.
2. Cada botón muestra info correcta (counts y montos en vivo).

### Caso B
1. Click Barra → navega a Servicio Rápido v2 (B2).

### Caso C
1. Mesera (otra tab) cobra una cuenta → Dashboard refresca counts en <30s.

---

## 6. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b6_dashboard_pov.md y impleméntalo completo.
Reporta archivos modificados, builds y los 3 casos validados.
```
