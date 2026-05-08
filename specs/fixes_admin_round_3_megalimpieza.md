# FIXES Admin — Round 3: MEGA-LIMPIEZA + bugs reportados por Coronado

Coronado entregó .docx + 39 capturas WhatsApp del 7 mayo 2026. La mayoría de las capturas son referencias visuales de **Soft Restaurant 8.1.0** (su sistema actual en el bar). Quiere que su Admin Bar Avenida cubra lo que él REALMENTE usa de Soft Restaurant, sin lo demás, y con UI **exageradamente buena**.

Este spec consolida:
- 3 bugs específicos reportados con capturas
- Limpieza profunda del menú top (eliminar opciones que NO usan)
- Habilitar Servicio Rápido (clientes en barra atendidos por meseros)
- Mejoras de UI/UX para nivel comercial

---

## BUG-1. Pantalla "Catálogos → Categorías" no permite eliminar

**Captura:** `correcciones/BUG-eliminar-A.png`
**Pantalla afectada:** `BarAvenida.Admin/src/screens/CatalogoProductosScreen.jsx` (vista CATEGORÍAS).
**Síntoma:** En la columna ACCIONES solo aparece un guion "—" pero no hay botón clickeable para eliminar. Los productos también se ven con "—" en acciones.
**Esperado:** En la columna ACCIONES, mostrar dos botones por fila:
- 🟡 **Editar** (icono lápiz) — abre modal para modificar nombre/orden/color
- 🔴 **Eliminar** (icono basurero) — pide confirmación. Si la categoría tiene productos asociados, mostrar warning "Esta categoría tiene N productos. Reasígnalos antes de eliminar."

**Implementación:**
- Frontend: en `CatalogoProductosScreen.jsx` agregar botones reales, no `—`.
- Backend: si no existe, crear `DELETE /api/admin/categorias/{id}` que valida productos asociados.
- Modal de confirmación reusable.

---

## BUG-2. Pantalla "Catálogos → Reglas de sugerencias" sin acciones por fila

**Captura:** `correcciones/BUG-eliminar-B.png`
**Pantalla afectada:** `BarAvenida.Admin/src/screens/ReglasCrossSellScreen.jsx`.
**Síntoma:** Cuando hay reglas configuradas, no se ven botones Editar/Eliminar por fila. La pantalla está vacía en el screenshot pero el problema reportado es la falta de acciones.
**Esperado:** Por cada fila de regla, columna ACCIONES con:
- 🟡 **Editar** — reabrir el modal con los datos existentes
- 🔴 **Eliminar** — confirmación + DELETE
- 🔵 **Toggle Activa/Inactiva** — switch rápido

---

## BUG-3. Login Admin — REVERTIR el botón "abc Letras / 123 Números"

**Captura:** `correcciones/BUG-numeros.png`
**Pantalla afectada:** `BarAvenida.Admin/src/screens/LoginScreen.jsx`.
**Texto literal de Coronado:** *"ESO DE LETRAS Y NUMEROS NO ME GUSTA ME GUSTABA MAS ANTES QUE SOLO APARECEN NUMEROS PERO DE COMO QUIERA QUE SE PUEDAN ESCRRIBIR LETRAS CON EL TECLADO"*

**Decisión:**
- **QUITAR** el botón toggle "abc Letras / 123 Números" completamente.
- Mostrar **SIEMPRE solo el numpad numérico** (1-9, 0, borrar, OK).
- El campo `<input>` del CÓDIGO debe seguir aceptando texto cualquiera del **teclado físico** (incluyendo letras) — esto significa NO bloquear `keydown` por tipo de carácter, solo el numpad pinta dígitos al hacer click.

**Implementación:**
- Eliminar botón "abc Letras" del JSX.
- Eliminar el QWERTY pad y todo el código relacionado (`qwerty-pad`, `qwerty-row`, `qwerty-actions` en CSS).
- El `<input>` debe ser editable manualmente con focus para teclado físico.
- Numpad sigue siendo la opción visual default.

---

## LIMPIEZA-1. Quitar opciones del menú top que NO se usan en el bar

**Análisis basado en 39 capturas de Soft Restaurant + lo que Coronado dice que usa:**

### CONFIGURACIÓN — limpiar
**Quitar:**
- "Configuración de estaciones" (no aplica, todo es una sola estación)
- "Áreas de impresión de comandas" (en gris, sin uso)
- "Contabilidad" (no se usa)
- "Configurar formatos de impresión" (lo deja como estaba)

**Dejar:**
- Configuración general (Datos del bar, Impresora, Cajón)
- Áreas de venta
- Formas de pago
- Folio de ticket

### EDICIÓN — quitar TODO el menú
Ya se quitó en Round 2.

### CATÁLOGOS — limpiar
**Quitar:**
- Meseros / Repartidores (ya está en Seguridad → Usuarios)
- Clientes (no se usa, son walk-ins)
- Promociones (no se usa)
- Tipos de descuento a clientes (no se usa)
- Insumos (materia prima) (no aplica, no preparan comida)
- Almacenes (no aplica)
- Tipo de proveedores (no aplica)
- Proveedores (no aplica)
- Tipo de mesa (innecesario, todas las mesas son iguales)

**Dejar:**
- Productos para venta
- Reglas de sugerencias
- Mesas

### CAJA — todo se queda
- Apertura de turno (F2)
- Cierre de turno (F3)
- Registrar/modificar propina en efectivo
- Pagar propinas de meseros
- Retiros y depósitos de efectivo
- Corte de caja X (parcial) (F6)
- Corte de caja Z (cierre)
- Histórico de cortes
- Historial de cajón
- Histórico de incidentes
- Abrir cajón de dinero (cuando esté impresora real)

### VENTAS — limpiar y habilitar Servicio Rápido
**Quitar:**
- "Pago agrupado" (no se usa)
- "Servicio DOMICILIO" (no aplica, no hacen domicilio)
- "Imprimir nota de consumo" (en gris, sin uso)
- "Reimprimir folios" (poco uso)
- "Tarjeta de crédito" (en gris, ya está integrado en cobro)

**HABILITAR (importante):**
- **"Servicio RÁPIDO" (F9)** — Coronado dice: *"NOSOTROS USAMOS MUCHO TAMBIEN EN RAPIDO PORQUE LOS QUE SE SIENTAN EN BARRA NOSOTROS LO ATENDEMOS"*. Esto es para clientes que se sientan en la BARRA (no en mesa) y los meseros los atienden directo sin asignar mesa. Debe abrir una "cuenta rápida" sin mesa numerada.

**Dejar:**
- Servicio COMEDOR (F7) — modo normal de mesa
- Servicio RÁPIDO (F9) ← NUEVO/HABILITAR
- Folios de comandas
- Facturación
- Cuentas por cobrar
- Solicitudes pendientes

### OPERACIONES — limpiar
**Quitar TODO** (no se usa nada):
- Gastos
- Cuentas por cobrar (consulta)
- Cuentas por pagar
- Pago de comisiones de agentes
- Cortesías

→ El menú OPERACIONES queda **vacío**, así que se quita completo del header.

### ALMACÉN — quitar TODO el menú
No tienen almacén (es bar, las botellas vienen y se venden directo). Quitar el menú completo.

### CONSULTAS — limpiar
**Dejar solo:**
- Histórico de cuentas
- Histórico de cortes (ya está en Caja también)

### REPORTES — todo se queda

### SEGURIDAD — todo se queda
- Usuarios
- Perfiles de seguridad
- Cambiar contraseña
- Cambio de usuario (Ctrl+U)

### MANTENIMIENTO — limpiar
**Quitar:**
- Exportar / Importar datos (no se usa)
- Sincronizar catálogo (no se usa)

**Dejar:**
- Base de datos (info técnica)
- Herramientas para administradores

### AYUDA — todo se queda

---

## LIMPIEZA-2. UI Comercial Premium

**Mejoras de diseño** (Coronado dijo "exageradamente bueno"):

1. **Tipografía:** usar fuente más profesional. Cambiar a `Inter` o `Manrope` (Google Fonts) en lugar de la default. Headers en **bold weight 700**, body en **400**.

2. **Espaciados:** aumentar padding general en cards, tablas, modales. Mínimo 16px de respiración.

3. **Animaciones suaves:**
   - `transition: all 0.2s ease` en hover de botones
   - Fade-in al cargar pantallas
   - Slide-in para modales

4. **Hover de filas en tablas:** background dorado tenue (`rgba(240, 200, 66, 0.08)`).

5. **Botones primarios:** usar gradiente dorado → cobrizo en hover.

6. **Toasts más elegantes:** posición esquina superior derecha, con icono según tipo (✓ verde / ⚠ amarillo / ✗ rojo / i azul), shadow suave, autoclose 4s.

7. **Loading states:** skeleton screens en lugar de "Cargando..." en texto plano.

8. **Empty states:** ilustraciones SVG (vasos, botellas, mesas) en lugar de texto solo.

---

## LIMPIEZA-3. Servicio Rápido — feature nueva

**Backend:**
- Nuevo endpoint `POST /api/cuentas/abrir-rapido` que crea cuenta SIN mesa asignada (`MesaId = null`).
- Modelo `Cuenta` ya soporta MesaId nullable, no requiere migración.
- Endpoint `GET /api/cuentas/rapidas-abiertas` para listar.

**Frontend Tablet:**
- Nuevo botón en pantalla principal: **"BARRA — VENTA RÁPIDA"** (atajo F9 si hay teclado).
- Abre directo la pantalla de captura sin pasar por selección de mesa.
- En la columna izquierda muestra "BARRA #1, BARRA #2..." en lugar de "M1, M2...".

**Frontend Admin:**
- En el dashboard de cuentas abiertas, separador "MESAS" / "BARRA RÁPIDO" para diferenciarlas visualmente.

---

## Reglas duras

- 0 errors / 0 warnings.
- NO instalar librerías nuevas (excepto la fuente Google Fonts via `<link>` en index.html).
- NO romper features existentes.
- Después del cleanup, validar TODOS los flujos críticos (login, abrir mesa, cobrar, cierre).
- Build admin 0/0, deploy con `Scripts/deploy-admin.ps1`.

## Aceptación

- ✅ Pantalla Categorías muestra botones Editar y Eliminar funcionando.
- ✅ Pantalla Reglas Cross-Sell muestra botones Editar/Eliminar/Toggle por fila.
- ✅ Login Admin tiene SOLO numpad (sin botón "abc Letras"), pero acepta teclado físico para letras.
- ✅ Menú top reducido a: CONFIGURACIÓN, CATÁLOGOS, CAJA, VENTAS, CONSULTAS, REPORTES, SEGURIDAD, MANTENIMIENTO, AYUDA (sin EDICIÓN, OPERACIONES, ALMACÉN).
- ✅ Servicio RÁPIDO funcionando: abrir cuenta sin mesa, capturar productos, cobrar.
- ✅ UI luce premium con tipografía Inter, animaciones suaves, hovers dorados.
- ✅ Build 0/0.
- ✅ Validación visual con Chrome MCP por Cowork al final.

## Archivos esperados al cierre

- Modificados:
  - `BarAvenida.Admin/src/screens/CatalogoProductosScreen.jsx` (BUG-1 + acciones)
  - `BarAvenida.Admin/src/screens/ReglasCrossSellScreen.jsx` (BUG-2)
  - `BarAvenida.Admin/src/screens/LoginScreen.jsx` (BUG-3 — quitar QWERTY)
  - `BarAvenida.Admin/src/screens/LoginScreen.css` (limpiar reglas qwerty)
  - `BarAvenida.Admin/src/components/TopMenuBar.jsx` (LIMPIEZA-1, quitar items)
  - `BarAvenida.Admin/src/index.css` o `App.css` (Inter font + animaciones globales)
  - `BarAvenida.API/Controllers/AdminController.cs` o `CatalogoController.cs` (DELETE categoria)
  - `BarAvenida.API/Controllers/CuentasController.cs` (POST abrir-rapido)
  - `BarAvenida.Tablet/src/App.jsx` + nueva pantalla Barra Rápida
- Nuevos:
  - `BarAvenida.Admin/src/components/AcccionesFila.jsx` (componente reusable de Editar/Eliminar)
  - `BarAvenida.Admin/src/components/ModalConfirmar.jsx` (modal genérico de confirmación)
  - `BarAvenida.Tablet/src/screens/BarraRapidaScreen.jsx`
