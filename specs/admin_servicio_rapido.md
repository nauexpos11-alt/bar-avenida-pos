# SPEC — Admin: Servicio Rápido (Barra)

> **Autor:** Cowork (orquestador)
> **Fecha:** 2026-05-09
> **Para:** Claude Code en F:\BarAvenida
> **Estimado:** 1 sesión (~30-45 min)
> **Estado backend:** YA IMPLEMENTADO (no tocar)
> **Estado frontend admin:** PENDIENTE (este spec)

---

## 1. Contexto

Coronado dijo en Round 3 (sesión 7-8 mayo):

> *"NOSOTROS USAMOS MUCHO TAMBIEN EN RAPIDO PORQUE LOS QUE SE SIENTAN EN BARRA NOSOTROS LO ATENDEMOS"*

En el bar:
- Hay clientes que **se sientan en la barra** (no en mesa numerada).
- A veces los atienden las **meseras** (ya hecho — `BarraRapidaScreen.jsx` en Tablet).
- A veces los atiende **el ADMIN directo** desde la barra (cuando no hay mesera disponible o el admin está en la barra ayudando) — **falta esto**.

Este spec implementa el flujo del lado **Admin**: una pantalla donde el admin puede abrir, atender y cobrar cuentas de BARRA sin necesidad de la tablet de la mesera.

---

## 2. Estado actual del sistema (NO TOCAR)

### 2.1. Backend — ya está listo

| Recurso | Estado |
|---|---|
| `Cuenta.MesaId` nullable (`int?`) | ✅ migración `CuentaMesaIdNullable` aplicada |
| Cuenta de barra: `MesaId=null`, `NombreCliente="BARRA #N"` | ✅ generado automáticamente |
| `POST /api/Cuentas/abrir-rapido` (body: `{meseraId}`) | ✅ |
| `GET /api/Cuentas/rapidas-abiertas` | ✅ |
| `POST /api/Cuentas/{id}/agregar-orden` | ✅ funciona igual con `MesaId=null` |
| `POST /api/Cuentas/{id}/cobrar` | ✅ funciona igual |
| Eventos SignalR: `CuentaAbierta`, `CuentaCobrada` | ✅ ya emiten al grupo Admin |

**No hay que tocar nada del backend.** Ya funciona end-to-end.

### 2.2. Tablet — ya está lista

`BarAvenida.Tablet/src/screens/BarraRapidaScreen.jsx` existe y permite a la mesera abrir cuenta de barra y atenderla. **No tocar.**

### 2.3. Admin — falta

El TopMenuBar actual no tiene opción para Servicio Rápido / Barra. El admin solo puede ver cuentas de barra **cuando ya pasaron a "PorCobrar"** y aparecen en `CuentasPorCobrarScreen` mezcladas con las cuentas de mesa.

---

## 3. Objetivo

Agregar al Admin:

1. **Item nuevo en TopMenuBar** sección PUNTO DE VENTA: `🍺 Barra` con shortcut `F9` (consistente con Soft Restaurant).
2. **Pantalla nueva** `BarraRapidaAdminScreen.jsx` con dos zonas:
   - **Izquierda:** lista de cuentas de barra abiertas (con cards: BARRA #N, mesera/admin, total, tiempo abierta).
   - **Derecha:** al seleccionar una cuenta, mostrar editor de productos (igual que la cuenta normal) + botón COBRAR.
3. **Botón "+ NUEVA BARRA"** arriba que abre cuenta nueva inmediatamente.
4. **Auto-refresh** vía SignalR cuando se abren/cierran cuentas de barra.

---

## 4. Diseño visual

### 4.1. TopMenuBar — agregar item

Editar `BarAvenida.Admin/src/components/TopMenuBar.jsx`. En la sección `pos`, después de `pos-mesas`, agregar:

```js
{ id: 'pos-barra', label: '🍺 Barra', screen: 'pos-barra', shortcut: 'F9' },
```

Si `tabs[].shortcut` no se renderiza actualmente, agregar el binding en el `useEffect` de teclado: `F9` → `irPantalla('pos-barra')`.

### 4.2. Pantalla `BarraRapidaAdminScreen.jsx`

**Layout:**

```
┌───────────────────────────────────────────────────────────────┐
│ 🍺 SERVICIO RÁPIDO — BARRA                  [+ NUEVA BARRA]   │
├──────────────────────┬────────────────────────────────────────┤
│                      │                                        │
│  Lista de cuentas    │   Editor de cuenta seleccionada        │
│  (cards)             │   (productos + total + COBRAR)         │
│                      │                                        │
│  [BARRA #1]          │   BARRA #1 — Coronado · 12:45 (15min) │
│  Coronado            │                                        │
│  $245.00 · 15 min    │   ┌──────────────────────────────┐    │
│                      │   │ + Cervezas                   │    │
│  [BARRA #2] ★        │   │ + Tequilas                   │    │
│  ABBY · $128 · 3min  │   │ + ...                        │    │
│                      │   └──────────────────────────────┘    │
│  ...                 │                                        │
│                      │   1x Corona  $35   [-][+][🗑]         │
│                      │   2x Cuerno  $80   [-][+][🗑]         │
│                      │   ...                                  │
│                      │                                        │
│                      │   Subtotal: $245.00                    │
│                      │                                        │
│                      │   [💵 COBRAR]   [✗ CANCELAR CUENTA]    │
│                      │                                        │
└──────────────────────┴────────────────────────────────────────┘
```

**Layout split:** lista izquierda flex 1 (~360px), editor derecha flex 2 (~ancho restante).

**Tema visual:** dorado #f0c842 + negro #0a0a0a, mismo estilo que el resto del Admin.

**Card de cuenta en lista (izquierda):**
- Fondo: `#1a1a1a`
- Borde dorado al hacer hover
- Borde dorado pleno cuando está seleccionada
- Header: `BARRA #N` grande en dorado
- Subtítulo: nombre de la mesera/admin que la abrió
- Footer: `$total · Xmin abierta`

**Editor de cuenta (derecha):**
- Reusar el mismo flujo de `CatalogoProductosScreen` para selección de categorías + productos
  - O crear un componente `ProductPickerSlim` que reciba `onAgregar(productoId, cantidad)`
- Lista de líneas como en la Tablet `CuentaScreen`
- Botón COBRAR grande verde (60px) abajo
- Botón cancelar al lado

### 4.3. + NUEVA BARRA

Click en el botón superior derecho:
1. `POST /api/Cuentas/abrir-rapido` con `{ meseraId: auth.id }` (el admin actúa como mesera).
2. Refrescar la lista (la SignalR `CuentaAbierta` también lo hará).
3. **Auto-seleccionar la cuenta nueva** en la zona derecha.

### 4.4. Cobrar

Reusar `CobrarCuentaModal` que ya existe en `BarAvenida.Admin/src/components/`. Mismo flujo que `CuentasPorCobrarScreen`:
1. Click `💵 COBRAR` → abre el modal.
2. Selecciona método (Efectivo / Tarjeta / Mixto), captura monto.
3. Confirma → `POST /api/Cuentas/{id}/cobrar`.
4. Imprime ticket + abre cajón si efectivo (la lógica ya existe).
5. Cuenta sale de la lista, se selecciona la siguiente o queda vacío el editor.

### 4.5. Cancelar cuenta

Click `✗ CANCELAR CUENTA` → modal de confirmación + motivo → `POST /api/Cuentas/{id}/cancelar` (admin tiene permisos directos, no necesita pasar por SolicitudesPendientes).

---

## 5. Archivos a crear / modificar

### Crear
- `BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.jsx` (~250 líneas)
- `BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.css` (~150 líneas)

### Modificar
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` — agregar item `pos-barra` + binding F9
- `BarAvenida.Admin/src/App.jsx` — agregar `case 'pos-barra'` con import + `<BarraRapidaAdminScreen ... />`
- `BarAvenida.Admin/src/api.js` — agregar:
  - `getCuentasRapidasAbiertas(token)` → `GET /api/Cuentas/rapidas-abiertas`
  - `abrirCuentaRapidaAdmin(token, body)` → `POST /api/Cuentas/abrir-rapido` body `{meseraId}` (acepta también admin)
  - **Verificar:** ¿ya existen estas funciones en `api.js`? Probablemente sí porque la Tablet las usa. Reutilizarlas.

### NO tocar
- Backend (todos los endpoints ya existen y funcionan)
- Migrations
- Tablet (`BarraRapidaScreen.jsx` se queda igual)
- KDS

---

## 6. SignalR

En `BarraRapidaAdminScreen.jsx`, conectar al hub `/barhub` y escuchar:
- `CuentaAbierta` → si la nueva cuenta tiene `MesaId === null`, recargar lista
- `CuentaCobrada` → si la cuenta cobrada estaba en la lista, removerla
- `CuentaCancelada` → si la cuenta cancelada estaba en la lista, removerla
- `OrdenAgregada` (si existe) o `CuentaActualizada` → recargar la cuenta seleccionada si coincide ID

Patrón a seguir: copiar de `CuentasPorCobrarScreen.jsx` el `useEffect` de SignalR. Unirse al grupo `Admin`.

---

## 7. Permisos

- Solo accesible para usuarios con `auth.rol === 'Admin'`.
- En `App.jsx`, antes del `case 'pos-barra'`, validar:
  ```jsx
  case 'pos-barra':
    return auth.rol === 'Admin'
      ? <BarraRapidaAdminScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      : <EnConstruccionScreen titulo="Acceso restringido" />
  ```
- En `TopMenuBar.jsx`, ocultar el item `pos-barra` si `auth.rol !== 'Admin'` (consistente con cómo se manejan otros items admin-only si los hay).

---

## 8. Validación

### 8.1. Builds
- `dotnet build` en BarAvenida.API → 0 errors, 0 warnings (no debería cambiar nada del backend).
- `npm run build` en BarAvenida.Admin → 0 errors, 0 warnings.

### 8.2. Casos E2E que Coronado debe poder hacer

**Caso A — Admin abre barra y cobra:**
1. Admin login (ADMIN/1234).
2. Click `🍺 Barra` (o F9).
3. Click `+ NUEVA BARRA` → aparece `BARRA #1` seleccionada en la derecha.
4. Agregar 2 cervezas Corona ($70).
5. Click `💵 COBRAR` → modal → Efectivo $100 → cobra → cambio $30 → imprime ticket → abre cajón.
6. La cuenta desaparece de la lista. Lista queda vacía.

**Caso B — Mesera abre barra desde tablet, admin la cobra desde admin:**
1. Mesera (`23/0001`) en tablet → BarraRapidaScreen → abre `BARRA #1` y le agrega 1 mezcal.
2. Admin abre `🍺 Barra` en admin → ve `BARRA #1` con la mesera asignada y el mezcal cargado.
3. Admin click cobrar → flujo normal.

**Caso C — Multi-barra simultánea:**
1. Abrir 3 cuentas de barra desde admin.
2. Cobrar la del medio.
3. Verificar que las otras 2 siguen ahí, numeración no se reusa (BARRA #4 sería la siguiente nueva).

**Caso D — SignalR:**
1. Admin abre el panel `🍺 Barra`.
2. Mesera en tablet abre nueva BARRA → admin ve la card aparecer **sin F5**.
3. Mesera agrega productos → admin (con esa cuenta seleccionada) ve los productos refrescarse.

### 8.3. Reportar al final
- Lista de archivos creados / modificados.
- Resultados de los 4 casos (PASS/FAIL).
- Screenshots si Cowork puede operar con Chrome MCP.

---

## 9. Notas finales

- **No instalar librerías nuevas.** Reusar `signalR`, `api.js`, `CobrarCuentaModal`.
- **Conservar archivos JSX/CSS** aunque queden sin uso.
- **Estilo de botones grandes** (60px+) consistente con el rest del Admin (touch friendly aunque sea desktop).
- **Después de implementado:** Cowork hará deploy a Program Files con `Scripts/deploy-admin.ps1` y validará E2E con Chrome MCP.

---

## 10. Comando para Coronado

Después de generar el spec, Coronado pasa esto a Claude Code:

```
Lee F:\BarAvenida\specs\admin_servicio_rapido.md y impleméntalo completo.
Reporta archivos modificados, builds y casos validados al terminar.
```
