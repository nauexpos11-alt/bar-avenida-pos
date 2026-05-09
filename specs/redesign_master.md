# SPEC MAESTRO — Rediseño Bar Avenida POS basado en Soft Restaurant 8.1.0

> **Autor:** Cowork (orquestador)
> **Fecha:** 2026-05-09
> **Para:** Claude Code en F:\BarAvenida (implementación) + Cowork (validación)
> **Origen:** Coronado mandó 17 capturas de su Soft Restaurant 8.1.0 actual
>            con la nota: *"esto de las imagenes es lo que mas usamos en el bar,
>            lo quiero con un diseño mucho mas bonito y funcional"*
>            y *"El número de folio tiene que coincidir con el número de
>            orden de la mesera"*

---

## 1. Filosofía del rediseño

**NO** copiar Soft Restaurant tal cual. Su UI es Win95-ish, llena de iconos pixelados, paneles flotantes, menús anidados profundos. Lo que sirve es **el flujo conceptual** que Coronado domina (porque lo lleva años usando).

**SÍ** mantener identidad Bar Avenida POS:
- Color primario: `#f0c842` (dorado)
- Fondo: `#0a0a0a` (negro)
- Fuente: Inter (ya en uso)
- Botones grandes (60px+) touch-friendly
- Iconos SVG modernos (no emoji-pix)
- Espaciado generoso
- Animaciones suaves (transiciones 200ms)
- Auto-refresh con SignalR
- Badges de color para estados

**Comparación honesta:**

| Concepto | Soft Restaurant (lo viejo) | Bar Avenida v2 (propuesta) |
|---|---|---|
| Lista de cuentas | Tabla fría con scroll | Cards con código de color + tiempo abierto |
| Servicio Rápido | Botones laterales feos + grid plano | Carrito izquierda + grid de categorías con contador + productos como tarjetas |
| Monitor ventas | Modal con números pegados | Pantalla completa con donas/barras y delta vs ayer |
| Histórico cuentas | Tabla densa con muchas columnas | Lista limpia + panel detalle al click |
| Comanda mesera | Folio en chico abajo | Orden #N GIGANTE arriba |
| Dashboard | Menús anidados 3 niveles | 4 botones gigantes con info inline |

---

## 2. Bloques del rediseño

| Bloque | Nombre | Esfuerzo | Impacto | Spec individual |
|---|---|---|---|---|
| 1 | Centro de Operación | L | ALTO | `redesign_b1_centro_operacion.md` |
| 2 | Servicio Rápido v2 | M | ALTO | `redesign_b2_servicio_rapido_v2.md` |
| 3 | Monitor de Ventas | M | MEDIO | `redesign_b3_monitor_ventas.md` |
| 4 | Histórico de Cuentas | M | MEDIO | `redesign_b4_historico_cuentas.md` |
| 5 | Folio = Orden Mesera | S | 🔥 CRÍTICO | `redesign_b5_folio_orden.md` |
| 6 | Dashboard Punto de Venta | S | MEDIO | `redesign_b6_dashboard_pov.md` |

**Total estimado:** 4-6 sesiones de Claude Code (~30-90 min cada una).

---

## 3. Orden de implementación recomendado

1. **B5 — Folio = Orden Mesera** (~30 min)
   - Fix del problema crítico mencionado por Coronado.
   - Backend: nuevo campo `NumeroOrden` en `Orden` (incremental por cuenta).
   - Ticket impreso: ORDEN #N gigante arriba.
   - Tablet: ya muestra órdenes numeradas; verificar consistencia.

2. **B2 — Servicio Rápido v2** (~60 min)
   - Refinar spec existente `admin_servicio_rapido.md` con el mockup mejorado.
   - Pantalla nueva en Admin con grid categorías + grid productos + carrito.
   - Reusa `CobrarCuentaModal`.

3. **B1 — Centro de Operación** (~90 min)
   - Pantalla nueva en Admin que reemplaza/complementa la lista de mesas.
   - Vista unificada de TODAS las cuentas (mesa + barra + por cobrar + solicitudes).
   - Auto-refresh SignalR.

4. **B6 — Dashboard PoV** (~30 min)
   - Pantalla de aterrizaje del Admin con 4 botones grandes.

5. **B3 — Monitor de Ventas** (~60 min)
   - Pantalla equivalente al Monitor de Ventas de Soft Rest, mejor diseñada.
   - Complementa Dashboard vivo (que ya existe) y Informe del día (que ya existe).

6. **B4 — Histórico de Cuentas** (~60 min)
   - Mejora la pantalla actual de Consulta histórico con filtros y panel detalle.

---

## 4. Cosas a NO romper

- **Backend funciona:** todo el sistema de mesas, cuentas, órdenes, cobros está validado y operando. Los specs nuevos AGREGAN o REORDENAN, no rompen.
- **Tablet meseras:** no tocar (tiene flujo refinado del 8 mayo).
- **KDS:** no tocar (tiene KDS Auto-pilot).
- **Catálogo de productos:** ya quedó bien con split layout.
- **Reglas de oro del proyecto:**
  - 0 errors / 0 warnings en builds
  - No instalar librerías nuevas sin permiso
  - No correr `dotnet run` ni `npm run dev`
  - Conservar archivos JSX/CSS aunque queden sin uso
  - Antes de tocar backend: `Stop-Service BarAvenidaAPI`
- **Endpoints existentes:** no romper. Si hay que extender, agregar campos opcionales y deprecate después.

---

## 5. Cosas que se VAN A reemplazar / quitar

| Pantalla actual | Reemplazo | Acción |
|---|---|---|
| `DashboardScreen.jsx` (mesas grid pelado) | Reusado dentro de Centro de Operación | Mantener `DashboardScreen.jsx` accesible vía sub-tab "Mesas" |
| Cualquier vista que muestre cuentas dispersas | Centro de Operación las consolida | Dejar las viejas en disco (regla de oro: conservar archivos) |

---

## 6. Cómo se irán pasando los bloques a Claude Code

Cada bloque tiene su propio archivo `redesign_bN_*.md`. Coronado (o Cowork si tiene acceso a la terminal) le pasa a Claude Code:

```
Lee F:\BarAvenida\specs\redesign_bN_<nombre>.md y impleméntalo completo.
Reporta archivos modificados, builds y casos validados al terminar.
```

Después de cada bloque, Cowork valida con Chrome MCP:
- Login → navegar a la pantalla nueva
- Probar 2-3 casos del spec
- Screenshots para Coronado

---

## 7. Dependencias entre bloques

```
B5 (Folio=Orden) ──┐
                   ├──> B1 (Centro) ──> B6 (Dashboard) ──> B3 (Monitor) ──> B4 (Histórico)
B2 (Rápido v2) ────┘
```

- B5 y B2 son independientes, se pueden hacer en paralelo.
- B1 reutiliza el flujo de cuentas + orden numerada de B5.
- B6 referencia las pantallas creadas en B1 y B2.
- B3 y B4 son los últimos, complementan UI sin tocar lógica core.

---

## 8. Validación E2E final

Después de los 6 bloques, Cowork ejecuta una validación end-to-end:

1. Login admin → ve Dashboard PoV (B6)
2. Click en MESAS → ve Centro de Operación (B1) con 5+ cuentas activas
3. Click en BARRA → ve Servicio Rápido v2 (B2), abre cuenta, agrega productos, cobra
4. Verifica que el ticket de cocina/barra impreso lleve ORDEN #N grande (B5)
5. Click en REPORTES → Monitor de Ventas (B3) con desglose visible
6. Click en Histórico → Histórico de Cuentas (B4) con filtros funcionando

---

## 9. Mensaje final para Coronado

Este rediseño tarda en entrar pero queda listo para los próximos 5 años de operación del bar. Soft Restaurant le sirvió a Coronado como blueprint mental, pero el resultado va a ser **el sistema POS más bonito y funcional que Saltillo haya visto**, ajustado al 100% a lo que Bar Avenida usa de verdad (sin domicilio, sin cocina, sin almacén, sin meseros/repartidores, sin facturación enterprise).

Cada bloque se entrega en **1 sesión de Claude Code** validada por Cowork. Si algo no queda como Coronado quiere, se itera con un fix rápido en la misma sesión.
