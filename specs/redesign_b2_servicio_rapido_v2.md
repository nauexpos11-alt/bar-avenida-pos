# SPEC — Bloque 2: Servicio Rápido v2 (Admin atendiendo barra)

> **Maestro:** `specs/redesign_master.md`
> **Reemplaza:** `specs/admin_servicio_rapido.md` (spec simple anterior)
> **Esfuerzo:** ~60 min
> **Impacto:** ALTO
> **Para:** Claude Code en F:\BarAvenida

---

## 1. Origen

Coronado mandó captura del "Servicio Rápido" de Soft Restaurant 8.1.0 con la nota:
> *"NOSOTROS USAMOS MUCHO TAMBIEN EN RAPIDO PORQUE LOS QUE SE SIENTAN EN BARRA NOSOTROS LO ATENDEMOS"*

La pantalla de Soft Rest tiene buena estructura conceptual pero estética Win95. Vamos a hacer el equivalente **bonito** en Bar Avenida POS Admin.

---

## 2. Estado del backend (NO TOCAR)

| Recurso | Estado |
|---|---|
| `Cuenta.MesaId` nullable (`int?`) | ✅ migración aplicada |
| `POST /api/Cuentas/abrir-rapido` (body: `{meseraId}`) | ✅ existente |
| `GET /api/Cuentas/rapidas-abiertas` | ✅ existente |
| `POST /api/Cuentas/enviar-orden` | ✅ existente, ya genera `NumeroOrden` después del Bloque 5 |
| `POST /api/Cuentas/{id}/cobrar` | ✅ existente |
| `POST /api/Cuentas/{id}/cancelar` | ✅ existente |
| Cross-sell `GET /api/Productos/{id}/sugerencias` | ✅ existente |

**Nada que tocar en backend.**

---

## 3. Layout final (mockup)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🍺 SERVICIO RÁPIDO — BARRA                            [+ NUEVA BARRA]       │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ CUENTAS BARRA   │  CUENTA SELECCIONADA: BARRA #3 · Folio #58042             │
│ (3 abiertas)    │  Abierta hace 12 min · Coronado                           │
│ ─────────────── │                                                            │
│ ▶ BARRA #3      │  ┌─── CATEGORÍAS ──────────────────────────────────┐    │
│   $245   12m    │  │┌─────┬─────┬─────┬─────┬─────┬─────┐            │    │
│ ─────────────── │  ││🍺   │🥃   │🥃   │🍹   │🍶   │🥤   │            │    │
│   BARRA #2      │  ││CERVE│TEQUI│WHISK│PREPA│RON  │REFRE│            │    │
│   $128    3m    │  ││ 16  │ 22  │ 20  │ 10  │ 10  │  4  │            │    │
│ ─────────────── │  │└─────┴─────┴─────┴─────┴─────┴─────┘            │    │
│   BARRA #1      │  │┌─────┬─────┬─────┬─────┬─────┬─────┐            │    │
│   $80    25m    │  ││🥒   │🌶️  │🍫   │🌿   │🍋   │⭐   │            │    │
│ ─────────────── │  ││CLAMA│PREPA│BOTAN│CIGAR│MEZCL│FAVOR│            │    │
│                 │  ││  8  │ 10  │ 11  │  4  │  3  │ 12  │            │    │
│                 │  │└─────┴─────┴─────┴─────┴─────┴─────┘            │    │
│                 │  └──────────────────────────────────────────────────┘    │
│                 │                                                            │
│                 │  ┌─── PRODUCTOS — CERVEZAS ────────────────────────┐    │
│                 │  │┌─────────┬─────────┬─────────┬─────────┐        │    │
│                 │  ││ Corona  │ Tecate  │  Indio  │ Victoria│        │    │
│                 │  ││  $40    │  $39    │  $35    │  $40    │        │    │
│                 │  │├─────────┼─────────┼─────────┼─────────┤        │    │
│                 │  ││ Bohemia │ XX      │ Heineken│ Modelo  │        │    │
│                 │  ││  $45    │  $100   │  $45    │  $50    │        │    │
│                 │  │└─────────┴─────────┴─────────┴─────────┘        │    │
│                 │  │  (scroll vertical si hay más)                   │    │
│                 │  └──────────────────────────────────────────────────┘    │
│                 │                                                            │
│                 │  ┌─── CARRITO (Orden #2) ───────────────────────────┐   │
│                 │  │ 2x Corona            $80    [-] [+] [🗑]        │   │
│                 │  │ 1x Tequila 1800      $75    [-] [+] [🗑]        │   │
│                 │  │ ─────────────────────────                        │   │
│                 │  │ Subtotal:    $155.00                              │   │
│                 │  │ TOTAL:       $155.00                              │   │
│                 │  │                                                   │   │
│                 │  │ [✕ Eliminar todo] [💬 Observaciones]              │   │
│                 │  │                                                   │   │
│                 │  │ ┌─────────────────────┐ ┌─────────────────────┐ │   │
│                 │  │ │  📤  ENVIAR ORDEN   │ │   💵  COBRAR        │ │   │
│                 │  │ │     (al barman)      │ │   (cerrar cuenta)   │ │   │
│                 │  │ └─────────────────────┘ └─────────────────────┘ │   │
│                 │  └───────────────────────────────────────────────────┘   │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

**Diferencias clave vs Soft Rest:**
- **No** botones laterales feos (TECLADO, DESCTO, CONSULTA PRECIOS, ABRIR CAJON sueltos).
- **Sí** flujo lineal: elige cuenta → elige categoría → elige productos → carrito abajo → ENVIAR/COBRAR.
- **Categorías** muestran emoji + nombre + cantidad de productos (no íconos pixelados).
- **Productos** como cards 4 columnas (no botones planos).
- **Carrito** integrado abajo, no en panel separado.

---

## 4. Comportamiento detallado

### 4.1. Lista de cuentas izquierda
- Cards con: `BARRA #N`, monto, tiempo abierta.
- La seleccionada lleva borde dorado pleno + flecha `▶`.
- Auto-refresh con SignalR (`CuentaAbierta`, `CuentaCobrada`, `CuentaCancelada`, `OrdenAgregada`).
- Click en cualquier card cambia el panel derecho a esa cuenta.
- Botón `+ NUEVA BARRA` arriba: `POST /api/Cuentas/abrir-rapido` con `{meseraId: auth.id}`. Auto-selecciona la nueva.

### 4.2. Categorías (grid superior)
- 12 categorías típicas (Cervezas, Tequilas, Whiskys, Preparados, Ron, Refrescos, Clamatos, Botanas, Cigarros, Mezcladores, Mezcal, Vodkas, Brandys, etc — usa los `Grupo`s del catálogo).
- Cada celda: emoji o ícono SVG + nombre + count de productos activos.
- Click → filtra el grid de productos abajo.
- La activa con borde dorado.

### 4.3. Productos (grid central)
- 4 columnas, scroll vertical.
- Cada card: nombre arriba, precio grande dorado abajo.
- Click → agrega 1 al carrito.
- Si ya está en el carrito, el contador en la card se incrementa (visual: badge en esquina superior derecha).
- **Cross-sell:** si el endpoint `/api/Productos/{id}/sugerencias` devuelve algo después de agregar, mostrar inline arriba del carrito un banner "💡 También sugerimos: [Hielo +$0] [Limón +$5]".

### 4.4. Carrito (abajo derecha)
- Lista de líneas: `<cantidad>x <nombre>   $<subtotal>   [-] [+] [🗑]`
- Scroll si pasa de 8 líneas.
- Total grande en dorado abajo.
- Botones de acción:
  - `✕ Eliminar todo` → vacía carrito (sin enviar)
  - `💬 Observaciones` → modal para agregar notas (`Observaciones` en `EnviarOrden`)
  - `📤 ENVIAR ORDEN` (verde, grande): `POST /api/Cuentas/enviar-orden`. Imprime ticket de barra con `ORDEN #N` (Bloque 5). Cuenta se actualiza, carrito se vacía.
  - `💵 COBRAR` (azul, grande): abre `CobrarCuentaModal` reutilizado. Al cobrar, cuenta sale de la lista.

### 4.5. Cobro
Reusar `CobrarCuentaModal` que ya existe. Mismo flujo que `CuentasPorCobrarScreen.jsx`:
- Selecciona método (Efectivo / Tarjeta / Mixto)
- Captura monto efectivo (si aplica)
- Confirma → `POST /api/Cuentas/{id}/cobrar`
- Imprime ticket cliente + abre cajón si efectivo (lógica ya existe)

### 4.6. Cancelar cuenta
Botón secundario al lado del cobrar (icono `🗑` o `✕`). Modal de confirmación + motivo → `POST /api/Cuentas/{id}/cancelar`. Admin tiene permisos directos, no pasa por SolicitudesPendientes.

---

## 5. Archivos a crear / modificar

### Crear
- `BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.jsx` (~320 líneas)
- `BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.css` (~200 líneas)
- `BarAvenida.Admin/src/components/CategoriaGrid.jsx` (componente reusable, opcional)
- `BarAvenida.Admin/src/components/ProductoGrid.jsx` (componente reusable, opcional)

### Modificar
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` — agregar item `pos-barra` en sección `pos`:
  ```js
  { id: 'pos-barra', label: '🍺 Barra', screen: 'pos-barra', shortcut: 'F9' },
  ```
  Si shortcuts no se renderizan automáticamente, agregar binding `F9 → irPantalla('pos-barra')` en el `useEffect` de teclado.
- `BarAvenida.Admin/src/App.jsx` — agregar `case 'pos-barra'` con import + componente
- `BarAvenida.Admin/src/api.js` — verificar que existan:
  - `getCuentasRapidasAbiertas(token)`
  - `abrirCuentaRapida(token, body)`
  - `enviarOrden(token, body)`
  - `cobrarCuenta(token, id, body)`
  - `cancelarCuenta(token, id, body)`
  - `getProductosActivos(token)` (catalogado)
  - `getSugerencias(token, productoId)`

### NO tocar
- Backend
- Tablet (`BarraRapidaScreen.jsx` se queda igual)
- KDS

---

## 6. SignalR

En `BarraRapidaAdminScreen.jsx`, conectar al hub `/barhub` y unirse al grupo `Admin`. Escuchar:
- `CuentaAbierta` → si `MesaId === null`, recargar lista
- `CuentaCobrada` → quitar de lista, deselecciona si era la activa
- `CuentaCancelada` → quitar de lista
- `CuentaActualizada` (id) → si coincide con la seleccionada, recargar productos

Patrón: copiar de `CuentasPorCobrarScreen.jsx` el `useEffect` de SignalR.

---

## 7. Permisos

Solo `auth.rol === 'Admin'`. En `App.jsx`:
```jsx
case 'pos-barra':
  return auth.rol === 'Admin'
    ? <BarraRapidaAdminScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
    : <EnConstruccionScreen titulo="Acceso restringido" />
```

---

## 8. Builds

- `npm run build` Admin → 0 errors / 0 warnings
- Deploy con `Scripts\deploy-admin.ps1`

---

## 9. Validación E2E

### Caso A — Admin abre cuenta y cobra
1. Login ADMIN/1234.
2. Click `🍺 Barra` (o F9).
3. Click `+ NUEVA BARRA` → aparece `BARRA #1` seleccionada en el panel derecho.
4. Click categoría `🍺 CERVEZAS`.
5. Click 2x en `Corona` → carrito muestra `2x Corona $80`.
6. Click categoría `🥃 TEQUILAS` → click en `Tequila 1800` → `+1 Tequila $75`.
7. Click `📤 ENVIAR ORDEN` → ticket barra impreso con `ORDEN #1`. Carrito se vacía.
8. Click `💵 COBRAR` → modal → Efectivo $200 → cobra → cambio $45 → ticket cliente. Cuenta sale de la lista.

### Caso B — Mesera abre, admin cobra
1. Mesera (tablet) → BarraRapidaScreen → abre `BARRA #1` y agrega 1 mezcal.
2. Admin abre `🍺 Barra` → ve `BARRA #1` con la mesera asignada y el mezcal cargado en el carrito.
3. Admin click `💵 COBRAR` → flujo normal.

### Caso C — Multi-barra simultánea
1. Abrir 3 cuentas de barra desde admin.
2. Cobrar la del medio.
3. Las otras 2 siguen, numeración no se reusa.

### Caso D — SignalR
1. Admin abre el panel `🍺 Barra`.
2. Mesera abre nueva BARRA → admin ve aparecer la card sin F5.
3. Mesera agrega productos → admin (con esa cuenta seleccionada) ve refrescarse el carrito.

### Caso E — Cross-sell
1. Agregar un Tequila al carrito.
2. Aparecer banner "💡 También sugerimos: [Hielo] [Limón] [Sangrita]" arriba del carrito (si hay reglas configuradas).
3. Click en una sugerencia → se agrega al carrito, banner desaparece para ese producto.

---

## 10. Notas finales

- **No instalar librerías nuevas.**
- **Conservar archivos JSX/CSS** aunque queden sin uso.
- **Botones grandes** (60px+) — esto va a ser usado tocando con el dedo en el monitor admin.
- **Tema dorado #f0c842 + negro #0a0a0a + Inter.**
- **Reportar al final:** archivos modificados, builds 0/0, los 5 casos E2E PASS/FAIL.

---

## 11. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b2_servicio_rapido_v2.md y impleméntalo completo.
Reporta archivos modificados, builds y los 5 casos validados al terminar.

Importante: este reemplaza el spec admin_servicio_rapido.md anterior.
```
