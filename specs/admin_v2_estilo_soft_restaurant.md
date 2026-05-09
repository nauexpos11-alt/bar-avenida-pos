# SPEC — Admin v2: estilo Soft Restaurant adaptado a Bar Avenida

**Fecha:** 2026-05-08
**Owner:** Coronado
**Stack afectado:** BarAvenida.Admin (React + Vite + Electron, build a `wwwroot/admin`)
**Origen:** Coronado mostró capturas del Soft Restaurant 8.1.0 que usaba antes y pidió replicar la estructura visual y de navegación, adaptada a su flujo real.

---

## Objetivo

Reorganizar la app Admin en **2 secciones principales** estilo Soft Restaurant:

1. **PUNTO DE VENTA** — operaciones del día a día (mesas, caja, cobros)
2. **ADMINISTRACIÓN** — configuración, catálogos, reportes, usuarios

Cada sección con su **menú de sub-tabs arriba** que reemplaza el actual `TopMenuBar` de 9 menús horizontales.

---

## Reglas globales

1. **NO instalar paquetes nuevos.** Todo con lo que ya hay en `package.json`.
2. **NO ejecutar `npm run dev`.** Solo `npm run build`.
3. **0 errors, 0 warnings** en build.
4. **Conservar archivos JSX/CSS sin uso** (regla del proyecto). Solo quitar imports/referencias del flujo principal.
5. **Conservar TODA la funcionalidad** existente. Las pantallas no cambian internamente, solo se reorganiza la navegación.
6. **Tema dorado #f0c842 + negro #0a0a0a.** Tipografía Inter (ya cargada vía Google Fonts).
7. **Después del build:** copiar `dist/*` a las DOS ubicaciones:
   - `F:\BarAvenida\BarAvenida.API\wwwroot\admin\`
   - `C:\Program Files\Bar Avenida\Server\wwwroot\admin\`
8. Reiniciar servicio `BarAvenidaAPI` después del deploy.

---

## ESTRUCTURA NUEVA

### Header (siempre visible, igual que ahora pero refactorizado)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo BAR AVENIDA] [usuario]  [reloj] [● EN LÍNEA] [SALIR]     │
└─────────────────────────────────────────────────────────────────┘
```

### Selector de sección (NUEVO — dos botones grandes abajo del header)

```
┌─────────────────────────────────────────────────────────────────┐
│  [🍺 PUNTO DE VENTA]                  [⚙️ ADMINISTRACIÓN]       │
└─────────────────────────────────────────────────────────────────┘
```

- Solo uno activo a la vez (radio behavior)
- El activo en dorado vibrante con borde inferior dorado de 3px
- El inactivo en gris oscuro con texto gris claro
- Animación de transición de 200ms al cambiar
- Persistir selección en localStorage (`ba_admin_seccion`) para que al recargar mantenga donde estaba

### Sub-tabs (cambian según la sección activa)

```
┌─────────────────────────────────────────────────────────────────┐
│  Mesas  Cuentas por cobrar  Solicitudes  Caja                  │  <- PUNTO DE VENTA
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  Productos  Mesas  Áreas  Reportes  Usuarios  Configuración    │  <- ADMINISTRACIÓN
└─────────────────────────────────────────────────────────────────┘
```

- Tabs separados por línea vertical sutil
- Tab activo en dorado, inactivos en gris
- Hover: borde inferior dorado de 2px
- Click: cambia la pantalla principal con fadeInUp 250ms

---

## MAPEO DE PANTALLAS

### PUNTO DE VENTA

| Tab | Pantalla existente | Notas |
|-----|--------------------|-----|
| 🍽️ **Mesas** | `DashboardScreen.jsx` | El grid de mesas en tiempo real. Esta es la pantalla principal de PUNTO DE VENTA. |
| 💵 **Cuentas por cobrar** | `CuentasPorCobrarScreen.jsx` | Lista de cuentas que las meseras solicitaron cobrar. Botón COBRAR en cada una. |
| 🔔 **Solicitudes pendientes** | `SolicitudesPendientesScreen.jsx` | Cancelaciones que las meseras pidieron y que el admin debe aprobar/rechazar. |
| 💰 **Caja** | (hub con sub-acciones) | Ver siguiente sección. |

**Sub-tabs dentro de "Caja":**

| Sub-tab | Pantalla |
|---------|----------|
| Apertura de turno | `TurnoCajaScreen.jsx` |
| Corte X (parcial) | `CortesCajaScreen.jsx` (tab "Corte X") |
| Corte Z (cierre) | `CortesCajaScreen.jsx` (tab "Corte Z") |
| Retiros / depósitos | `RetirosCajaScreen.jsx` |
| Histórico cajón | `HistorialCajonScreen.jsx` |
| Histórico cortes | `CortesCajaScreen.jsx` (tab "Histórico") |
| Incidentes | `CortesCajaScreen.jsx` (tab "Incidentes") |

### ADMINISTRACIÓN

| Tab | Pantalla existente | Notas |
|-----|--------------------|-----|
| 📦 **Productos** | `CatalogoProductosScreen.jsx` | El que más se va a usar. Lista clave/grupo/descripción/precio + editor a la derecha. **Pulir UI estilo Soft Restaurant** (ver más abajo). |
| 🪑 **Mesas** | `MesasScreen.jsx` (admin) | CRUD de mesas físicas. |
| 🗺️ **Áreas** | `AreasScreen.jsx` | CRUD de áreas (Comedor, Terraza). |
| 🎯 **Reglas sugerencias** | `ReglasCrossSellScreen.jsx` | (Conservar tal cual.) |
| 📊 **Reportes** | (hub) | Ver siguiente. |
| 🛡️ **Usuarios** | `UsuariosScreen.jsx` | CRUD usuarios + perfiles. |
| ⚙️ **Configuración** | (hub) | Ver siguiente. |

**Sub-tabs dentro de "Reportes":**

| Sub-tab | Pantalla |
|---------|----------|
| Dashboard vivo | `DashboardLiveScreen.jsx` |
| Informe del día | `InformeDiaScreen.jsx` |
| Resumen de ventas | `ReportesScreen.jsx` (tab) |
| Productos top | `ReportesScreen.jsx` (tab) |
| Ventas por mesera | `ReportesScreen.jsx` (tab) |
| Ventas por categoría | `ReportesScreen.jsx` (tab) |
| Ventas por hora | `ReportesScreen.jsx` (tab) |
| Métodos de pago | `ReportesScreen.jsx` (tab) |

**Sub-tabs dentro de "Configuración":**

| Sub-tab | Pantalla |
|---------|----------|
| General | `ConfigGeneralScreen.jsx` (negocio + impresora + cajón) |
| Formas de pago | `FormasPagoScreen.jsx` |
| Folio de ticket | `FolioScreen.jsx` |
| Cambiar PIN | `CambiarPinScreen.jsx` |

---

## ARCHIVOS A MODIFICAR

### 1. `BarAvenida.Admin/src/components/TopMenuBar.jsx`

**Refactor profundo.** Borrar el array `MENUS` actual. Reemplazar la nueva estructura:

```jsx
const SECCIONES = [
  {
    id: 'pos',
    label: 'PUNTO DE VENTA',
    icon: '🍺',
    tabs: [
      { id: 'pos-mesas',         label: 'Mesas',                 screen: 'pos-mesas' },
      { id: 'pos-cobrar',        label: 'Cuentas por cobrar',    screen: 'cuentas-por-cobrar' },
      { id: 'pos-solicitudes',   label: 'Solicitudes',           screen: 'solicitudes-pendientes' },
      { id: 'pos-caja',          label: 'Caja',                  hub: true,
        sub: [
          { label: 'Apertura turno',     screen: 'caja-apertura-turno', shortcut: 'F2' },
          { label: 'Corte X',            screen: 'caja-corte-x',        shortcut: 'F6' },
          { label: 'Corte Z',            screen: 'caja-corte-z' },
          { label: 'Retiros',            screen: 'caja-retiros' },
          { label: 'Histórico cajón',    screen: 'historial-cajon' },
          { label: 'Histórico cortes',   screen: 'caja-historico-cortes' },
          { label: 'Incidentes',         screen: 'caja-incidentes' },
        ]
      },
    ],
  },
  {
    id: 'admin',
    label: 'ADMINISTRACIÓN',
    icon: '⚙️',
    tabs: [
      { id: 'adm-productos',  label: 'Productos',          screen: 'cat-productos' },
      { id: 'adm-mesas',      label: 'Mesas',              screen: 'cat-mesas' },
      { id: 'adm-areas',      label: 'Áreas',              screen: 'config-areas-venta' },
      { id: 'adm-reglas',     label: 'Sugerencias',        screen: 'cat-reglas-crosssell' },
      { id: 'adm-reportes',   label: 'Reportes',           hub: true,
        sub: [
          { label: 'Dashboard vivo',    screen: 'rep-dashboard-live' },
          { label: 'Informe del día',   screen: 'rep-informe-dia' },
          { label: 'Resumen ventas',    screen: 'rep-ventas-resumen' },
          { label: 'Productos top',     screen: 'rep-productos-top' },
          { label: 'Ventas por mesera', screen: 'rep-ventas-mesera' },
          { label: 'Ventas categoría',  screen: 'rep-categorias' },
          { label: 'Ventas por hora',   screen: 'rep-ventas-hora' },
          { label: 'Métodos de pago',   screen: 'rep-metodos-pago' },
        ]
      },
      { id: 'adm-usuarios',   label: 'Usuarios',           screen: 'usuarios' },
      { id: 'adm-config',     label: 'Configuración',      hub: true,
        sub: [
          { label: 'General',         screen: 'config-general' },
          { label: 'Formas de pago',  screen: 'config-formas-pago' },
          { label: 'Folio ticket',    screen: 'config-folios' },
          { label: 'Cambiar PIN',     screen: 'seg-contrasena' },
        ]
      },
    ],
  },
]
```

El componente debe:

1. Mantener el header existente (logo, reloj, usuario, EN LÍNEA, SALIR, badge alertas).
2. Renderizar debajo los **2 botones grandes** PUNTO DE VENTA / ADMINISTRACIÓN.
3. Renderizar debajo los **sub-tabs** de la sección activa.
4. Cuando se hace click en un tab tipo `hub: true`, mostrar dropdown con sus `sub` items.
5. Persistir la sección activa en `localStorage.ba_admin_seccion`.
6. Persistir la última pantalla activa en `localStorage.ba_admin_ultima_pantalla`.
7. Mantener los shortcuts F2, F3, F6, F7, F9, CTRL+U.
8. Mantener el badge de SOLICITUDES PENDIENTES en el tab "Solicitudes" de PUNTO DE VENTA.
9. Mantener el botón de alertas de caja con su drawer.

### 2. `BarAvenida.Admin/src/components/TopMenuBar.css`

Estilos completos para la nueva estructura. Diseño profesional:

```css
/* Selector de seccion - 2 botones grandes */
.seccion-selector {
  display: flex;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
  height: 56px;
}

.seccion-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: transparent;
  border: none;
  color: #555;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
  position: relative;
  border-bottom: 3px solid transparent;
  padding: 0 24px;
}

.seccion-btn:hover { color: #ccc; background: rgba(255,255,255,0.02); }

.seccion-btn.activa {
  color: #f0c842;
  border-bottom-color: #f0c842;
  background: linear-gradient(180deg, transparent 0%, rgba(240,200,66,0.06) 100%);
}

.seccion-btn .seccion-icon {
  font-size: 1.3rem;
  filter: drop-shadow(0 2px 4px rgba(240,200,66,0.2));
}

/* Sub-tabs */
.sub-tabs {
  display: flex;
  background: #131313;
  border-bottom: 1px solid #1f1f1f;
  height: 44px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.sub-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  background: transparent;
  border: none;
  color: #888;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  position: relative;
  border-right: 1px solid #1a1a1a;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;
}

.sub-tab:hover { color: #ddd; background: rgba(240,200,66,0.04); }

.sub-tab.activa {
  color: #f0c842;
  font-weight: 700;
}

.sub-tab.activa::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #f0c842;
  box-shadow: 0 0 8px rgba(240,200,66,0.5);
}

/* Dropdown de tabs hub */
.sub-tab-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #161616;
  border: 1px solid #2a2a2a;
  border-top: none;
  border-radius: 0 0 8px 8px;
  min-width: 220px;
  z-index: 100;
  animation: slideDown 0.15s ease-out;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.sub-tab-dropdown-item {
  display: block;
  padding: 12px 18px;
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid #1a1a1a;
  transition: background 0.12s, color 0.12s;
}

.sub-tab-dropdown-item:hover {
  background: rgba(240,200,66,0.08);
  color: #f0c842;
}

.sub-tab-dropdown-item:last-child { border-bottom: none; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 3. `BarAvenida.Admin/src/screens/CatalogoProductosScreen.jsx` y `.css`

**Pulido estilo Soft Restaurant.** La pantalla queda así:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Selector grupo] [Buscar...]                          [+ Nuevo] │
├──────────────────────────────────┬──────────────────────────────┤
│ Clave │ Grupo │ Descripción │ $ │ ▼ Editor producto            │
├───────┼───────┼─────────────┼───┤                              │
│  1    │ Cerv. │ Corona      │40 │  Nombre: [______]            │
│  2    │ Cerv. │ Tecate      │39 │  Categoría: [Cervezas ▾]     │
│  3    │ Cerv. │ Indio       │35 │  Precio: $[______]           │
│  4    │ Cerv. │ Victoria    │40 │  TipoVenta: [Pieza ▾]        │
│  ...                             │  Activo: [✓]                 │
│                                  │                              │
│                                  │  [GUARDAR]  [CANCELAR]       │
└──────────────────────────────────┴──────────────────────────────┘
```

- Lista a la izquierda con las columnas Clave (Id), Grupo (categoría), Descripción (nombre), Precio
- Editor a la derecha que se rellena al hacer click en un producto
- Botón "+ Nuevo" arriba derecha que abre el editor en modo creación
- Filas en zebra (alternar #131313 / #0f0f0f)
- Hover en fila resalta dorado tenue
- Selección con borde izquierdo dorado de 3px
- Buscador funciona en cualquier columna (nombre, categoría, precio)
- Selector de grupo funciona como filtro de categoría

**No tocar la lógica existente** (handlers de guardar/eliminar/etc), solo el JSX y CSS para acomodar el layout.

---

## PANTALLA "POS-MESAS" — pantalla principal de PUNTO DE VENTA

`BarAvenida.Admin/src/screens/DashboardScreen.jsx` ya existe y muestra el grid de mesas con cuentas activas. Conservar tal cual.

Cuando el admin abre la app, por default se ve la sección PUNTO DE VENTA con el tab "Mesas" activo, mostrando el `DashboardScreen`.

---

## App.jsx — actualizar el router de pantallas

`F:\BarAvenida\BarAvenida.Admin\src\App.jsx`

El switch de `screen` debe mapear a las pantallas correctas:

```jsx
case 'pos-mesas':              return <DashboardScreen ... />
case 'cuentas-por-cobrar':     return <CuentasPorCobrarScreen ... />
case 'solicitudes-pendientes': return <SolicitudesPendientesScreen ... />
case 'caja-apertura-turno':    return <TurnoCajaScreen ... />
case 'caja-corte-x':           return <CortesCajaScreen tab="x" ... />
case 'caja-corte-z':           return <CortesCajaScreen tab="z" ... />
case 'caja-historico-cortes':  return <CortesCajaScreen tab="historico" ... />
case 'caja-incidentes':        return <CortesCajaScreen tab="incidentes" ... />
case 'caja-retiros':           return <RetirosCajaScreen ... />
case 'historial-cajon':        return <HistorialCajonScreen ... />
case 'cat-productos':          return <CatalogoProductosScreen ... />
case 'cat-mesas':              return <MesasScreenAdmin ... />
case 'config-areas-venta':     return <AreasScreen ... />
case 'cat-reglas-crosssell':   return <ReglasCrossSellScreen ... />
case 'rep-dashboard-live':     return <DashboardLiveScreen ... />
case 'rep-informe-dia':        return <InformeDiaScreen ... />
case 'rep-ventas-resumen':     return <ReportesScreen tab="ventas" ... />
case 'rep-productos-top':      return <ReportesScreen tab="productos" ... />
case 'rep-ventas-mesera':      return <ReportesScreen tab="meseras" ... />
case 'rep-categorias':         return <ReportesScreen tab="categorias" ... />
case 'rep-ventas-hora':        return <ReportesScreen tab="hora" ... />
case 'rep-metodos-pago':       return <ReportesScreen tab="metodos" ... />
case 'usuarios':               return <UsuariosScreen ... />
case 'config-general':         return <ConfigGeneralScreen ... />
case 'config-formas-pago':     return <FormasPagoScreen ... />
case 'config-folios':          return <FolioScreen ... />
case 'seg-contrasena':         return <CambiarPinScreen ... />
```

Todos los nombres de screen ya están definidos en el TopMenuBar nuevo. Si alguno no coincide con lo que el switch ya tenía, **prioriza el spec** (ajusta el router para que coincida con los nombres del nuevo TopMenuBar).

Pantallas que **NO** se mapean (placeholders viejos): borrar del switch:
- `caja-propinas`
- `caja-pagar-propinas`
- `ventas-comedor`, `ventas-rapido`, `ventas-folios`, `ventas-facturacion` (no aplican)
- `cons-cuentas` (legacy)
- `seg-perfiles`, `seg-cambio-usuario` (legacy)
- `mant-bd`, `mant-admin`
- `ayuda-soporte`, `ayuda-info`, `ayuda-acerca`

Si alguna de esas tiene una pantalla real (no `EnConstruccionScreen`), puedes conservar el case por compatibilidad pero quítala del menú.

---

## Validación post-deploy

1. Build: `npm run build` desde `F:\BarAvenida\BarAvenida.Admin` — 0 errors, 0 warnings
2. Copiar a las 2 ubicaciones de wwwroot/admin
3. Reiniciar servicio
4. Abrir Admin (Electron o web): `http://192.168.100.10:7000/admin/`
5. Login con admin
6. Verificar:
   - Header arriba con reloj, usuario, EN LÍNEA, SALIR
   - 2 botones grandes: PUNTO DE VENTA (activo por default) / ADMINISTRACIÓN
   - Sub-tabs cambian al cambiar de sección
   - Cada tab navega a la pantalla correcta sin errores en consola
   - Los hubs (Caja, Reportes, Configuración) muestran dropdown con sub-items
   - Badge de solicitudes pendientes funciona
   - Atajos F2/F3/F6/F7/F9 funcionan
   - localStorage persiste la última sección al recargar

---

## Diseño de referencia (resumen)

- **Header:** 56px alto, fondo #0a0a0a, separador inferior #1a1a1a
- **Selector de sección:** 56px alto, 2 botones igual ancho, dorado activo
- **Sub-tabs:** 44px alto, fondo #131313, scroll horizontal si no caben
- **Pantallas:** ocupan el resto de la altura. Padding interno 16-24px.
- **Tipografía:** Inter, peso 400-700-800-900 según jerarquía
- **Animaciones:** todas 150-250ms, ease-out
- **Bordes redondeados:** 8px tarjetas, 10px botones, 4px tabs

---

## Notas para Claude Code

- **NO tocar** las pantallas individuales (DashboardScreen, ReportesScreen, etc.) salvo `CatalogoProductosScreen` que sí lleva pulido visual (el layout izquierda lista / derecha editor).
- Si una pantalla referenciada en el switch no existe físicamente, créala como wrapper mínimo que renderice "Próximamente" con el componente `EnConstruccionScreen` que ya existe.
- Si hay conflicto entre nombres del spec y código real, **prioriza el spec** y reporta diferencias al final.
- **NO** hacer commits, solo el código. El commit lo hace Coronado al final.
- Build con 0 warnings — si algo nuevo trae warning, repórtalo.
- Después del build copiar a:
  - `F:\BarAvenida\BarAvenida.API\wwwroot\admin\` (referencia desarrollo)
  - `C:\Program Files\Bar Avenida\Server\wwwroot\admin\` (donde sirve el servicio real)
- Reiniciar `BarAvenidaAPI` después del deploy: `Stop-Service BarAvenidaAPI; Start-Service BarAvenidaAPI`.
