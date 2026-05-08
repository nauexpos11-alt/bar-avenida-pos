# FIXES Admin — Round 1

Auditoría Cowork del 7 mayo 2026. Recorrido pantalla por pantalla del Admin. Hallazgos clasificados por severidad.

---

## 🔴 CRÍTICOS — bloquean o degradan operación real

### FIX-1. Mesas se ordenan alfabéticamente, no numérico

**Pantalla:** Dashboard principal del Admin (grid de mesas).
**Síntoma:** Las mesas aparecen como `1, 10, 11, 12, 13, 15, 16, 18, 19, 2, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 3, 30, 31, ...`. Eso es orden alfabético de strings, no orden numérico de enteros.
**Esperado:** `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ..., 50`.
**Causa probable:** la API devuelve mesas ordenadas por `Numero` como string, o el frontend hace `sort()` sin comparador numérico.
**Fix:**
- Backend: en el endpoint `GET /api/Mesas`, ordenar `OrderBy(m => m.Numero)` (si es int) o `OrderBy(m => int.Parse(m.Numero))` (si es string).
- Frontend (defensa adicional): en el componente del grid, hacer `.sort((a, b) => Number(a.numero) - Number(b.numero))`.

### FIX-2. Login del Admin no se puede usar sin teclado físico

**Pantalla:** Login del Admin.
**Síntoma:** El campo "Código" requiere texto (ej: "ADMIN") pero el teclado en pantalla **solo tiene números**. Sin teclado físico, el admin no puede entrar.
**Esperado:** Que el admin pueda escribir su código alfanumérico desde el teclado de pantalla.
**Fix preferido:** agregar un botón "ABC ↔ 123" abajo del NumPad que alterna entre teclado numérico y teclado QWERTY. Cuando esté en QWERTY mostrar las letras como botones grandes (igual estilo que los números).
**Alternativa más simple:** detectar si se necesita texto vs número y mostrar `<input>` libre + el teclado numérico solo cuando sea PIN.

### FIX-3. "Impresión habilitada" ON pero "Impresora instalada" vacía

**Pantalla:** Configuración general → tab Impresora.
**Síntoma:** El toggle "Impresión habilitada" está en ON, pero el dropdown "Impresora instalada" muestra `--- Seleccionar ---`. Si alguien intenta cobrar, el ticket no se imprime y, por la regla "print-first puro", el cobro **falla**.
**Esperado:** Validación que impida guardar la configuración si Impresión está habilitada y no hay impresora seleccionada.
**Fix:**
- Frontend: al hacer click en "Guardar cambios", si `impresionHabilitada === true && !nombreImpresoraUsb`, mostrar toast de error rojo: "Selecciona una impresora antes de habilitar la impresión".
- Backend: en `ConfiguracionTicket.PUT`, devolver 400 si la combinación es inválida.

### FIX-4. Mesa M1 fantasma sigue ocupada (6+ horas)

**Pantalla:** Dashboard del Admin → "Cuentas abiertas: M1 03:21 p.m. $0".
**Síntoma:** La Mesa 1 fue abierta hace 6 horas por ABBY GZZ durante pruebas, está vacía ($0) pero sigue marcada como ocupada. El detector de alertas la grita cada 60s.
**Esperado:** Poder cerrar mesas vacías desde el Admin sin pasar por el flujo de cobro normal.
**Fix:**
- Backend: endpoint `POST /api/Cuentas/{id}/cancelar` (probablemente ya existe) — verificar que el Admin pueda usarlo sin pasar por la mesera.
- Frontend Admin: en la lista "Cuentas abiertas", agregar botón rojo "Cancelar mesa vacía" que solo aparece cuando `total === 0`. Confirma con modal "¿Cancelar Mesa X? Está vacía y lleva Y minutos abierta."
- Como fix inmediato: limpiar la M1 de ABBY hoy con SQL: `UPDATE Cuentas SET Estado='Cancelada', FechaCobro=GETDATE() WHERE Id=1 AND Estado='Abierta'`

---

## 🟡 BUGS DE CALIDAD / EXPERIENCIA

### FIX-5. Menú EDICIÓN entero deshabilitado

**Pantalla:** Header → menú EDICIÓN.
**Síntoma:** Las 3 opciones (Deshacer / Copiar / Pegar) están en gris, no hacen nada. Es un menú vacío.
**Decisión necesaria de Coronado:**
- Opción A: si NO se planea implementar → **quitar el menú EDICIÓN completo** del header. Libera espacio.
- Opción B: si SÍ se planeará → dejar como está.
**Fix recomendado:** Opción A (quitar). Estas funciones ya están cubiertas por los shortcuts nativos del browser (Ctrl+C, Ctrl+V, Ctrl+Z) en cualquier campo de texto.

### FIX-6. Items deshabilitados en otros menús

**Pantallas:** Header → menús varios.
**Síntoma:** Hay items en gris ("Próximamente" implícito):
- CONFIGURACIÓN → "Áreas de impresión de comandas"
- CAJA → "Abrir cajón de dinero"
- VENTAS → "Pago agrupado", "Servicio DOMICILIO", "Servicio RÁPIDO", "Imprimir nota de consumo", "Reimprimir folios", "Tarjeta de crédito"
**Fix:**
- Si NO se planean implementar pronto: quitarlos.
- Si se planean: agregar un tooltip al hover que diga "Próximamente" para que el operador no se confunda esperando que funcionen.
**Recomendación:** decidir por menú. CAJA → "Abrir cajón de dinero" sí debería habilitarse cuando haya impresora real conectada.

### FIX-7. Producto de prueba "Cerveza Heineken Test" en catálogo

**Pantalla:** Catálogos → Productos para venta (id 1003).
**Síntoma:** Producto residual de pruebas. No es fatal pero ensucia.
**Fix:** SQL directo: `DELETE FROM Productos WHERE Id = 1003 AND Nombre LIKE '%Test%'`.

### FIX-8. Datos del negocio incompletos

**Pantalla:** Configuración general → Datos del negocio.
**Síntoma:**
- Dirección: solo "Calle mariano matamoros" (falta número 1056 y "Zona Centro, Saltillo, Coahuila CP 25000").
- Teléfono: vacío (debería ser "844 130 7069" según CLAUDE.md).
- RFC: vacío (puede ser intencional, aclarar).
**Fix:** Coronado los completa manualmente desde la pantalla. **No es bug del código**, es dato faltante. Agregado como recordatorio.

### FIX-9. Reloj depende del cliente, no del servidor

**Pantalla:** Header (reloj de la esquina derecha) y Dashboard vivo.
**Síntoma:** El reloj usa `new Date()` del browser. Si las PCs del bar tienen distintas zonas horarias o el reloj del sistema mal configurado, cada pantalla muestra una hora distinta. El backend usa otra hora (UTC + zona del servidor).
**Fix:** Backend expone `GET /api/server-time` que devuelve `{ utc, zona, hora_local }`. El frontend pide esa hora al arrancar y la usa como ground truth (con offset por delta de red). Alternativamente, hacer que TODOS los clientes usen `America/Monterrey` explícitamente sin importar la TZ del sistema.

---

## 🟢 MEJORAS UX

### FIX-10. KPIs del Dashboard vivo con iconos crípticos

**Pantalla:** Reportes → Dashboard vivo.
**Síntoma:** Las 4 cards arriba muestran iconos `$`, `#`, `~`, `+`. El `~` para "Ticket promedio" y el `+` para "Productos vendidos" no comunican nada.
**Fix:** Reemplazar por iconos SVG del set existente:
- VENTAS HOY → bolsa de dinero (ya hay uno en sidebar)
- CUENTAS HOY → ticket / nota
- TICKET PROMEDIO → ticket pequeño con `≈`
- PRODUCTOS HOY → caja / inventario

### FIX-11. Botón "REPORTES" duplicado en Dashboard

**Pantalla:** Dashboard principal → esquina superior derecha del panel central.
**Síntoma:** Hay un botón dorado "REPORTES" arriba del grid de mesas que parece duplicar la función del menú top "REPORTES".
**Fix:** Decidir qué hace ese botón. Si abre el mismo menú/dropdown del top, quitarlo. Si abre algo diferente (ej: "Reporte rápido del día actual"), renombrarlo para diferenciar ("Reporte HOY").

---

## Reglas duras

- 0 errors, 0 warnings al compilar.
- NO instalar librerías nuevas.
- Mantener tema dorado/negro y los componentes existentes.
- Respetar las reglas de oro del proyecto (CLAUDE.md sección 5).

## Aceptación

- ✅ FIX-1: las mesas en el grid del Dashboard aparecen 1, 2, 3...50.
- ✅ FIX-2: se puede entrar como ADMIN desde teclado en pantalla (sin teclado físico).
- ✅ FIX-3: si Impresión está habilitada sin impresora, Guardar muestra error.
- ✅ FIX-4: hay un botón "Cancelar mesa vacía" en el panel de Cuentas Abiertas.
- ✅ FIX-5: menú EDICIÓN ya no aparece en el header.
- ✅ FIX-6: items deshabilitados tienen tooltip "Próximamente" o se quitaron.
- ✅ FIX-7: el producto Heineken Test ya no está en el catálogo.
- ✅ FIX-8: Coronado completa los datos del bar (manual).
- ✅ FIX-9: el reloj del header viene del backend, no del cliente.
- ✅ FIX-10: los KPIs del Dashboard vivo usan iconos SVG.
- ✅ FIX-11: decisión tomada sobre el botón REPORTES duplicado.
- ✅ Build Admin 0/0 y validación visual con Chrome MCP.

## Archivos esperados al cierre

Modificados (probable):
- `BarAvenida.API/Controllers/MesasController.cs` (FIX-1 backend)
- `BarAvenida.API/Controllers/CuentasController.cs` (FIX-4 backend)
- `BarAvenida.API/Controllers/AdminController.cs` o nuevo `ServerTimeController.cs` (FIX-9)
- `BarAvenida.Admin/src/screens/MesasScreen.jsx` (FIX-1 frontend defense)
- `BarAvenida.Admin/src/screens/LoginScreen.jsx` (FIX-2)
- `BarAvenida.Admin/src/screens/ConfigGeneralScreen.jsx` (FIX-3)
- `BarAvenida.Admin/src/screens/DashboardScreen.jsx` (FIX-4 botón cancelar mesa vacía + FIX-11)
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` (FIX-5, FIX-6)
- `BarAvenida.Admin/src/screens/DashboardLiveScreen.jsx` (FIX-10)

Datos manuales:
- Borrar producto 1003 (SQL one-shot).
- Cancelar Cuenta 1 fantasma (SQL one-shot).
- Coronado completa datos del bar en Admin.
