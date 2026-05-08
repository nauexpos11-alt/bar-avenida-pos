# SPEC B3.5 — Validación end-to-end de Solicitudes de Cancelación

> **Tipo:** validación (no implementa código nuevo)
> **Bloquea:** cierre de Fase 0
> **Tiempo estimado:** 30-45 min
> **Pre-requisito:** build limpio de `BarAvenida.Admin` (0 errors, 0 warnings)

---

## 1. Objetivo

Verificar que el flujo completo de solicitudes de cancelación funciona correctamente
end-to-end: Tablet (mesera) → Backend (SignalR) → Admin (Cowork B3) → Backend
(aprobación/rechazo) → Tablet (mesa vuelve al estado normal).

## 2. Pre-flight (antes de empezar)

```powershell
# 1. Asegurarse que el backend NO esté corriendo
taskkill /F /IM BarAvenida.API.exe /T

# 2. Build limpio del Admin (esperado: 0/0)
cd F:\BarAvenida\BarAvenida.Admin
npm run build

# 3. Build limpio del Tablet (sanity check)
cd F:\BarAvenida\BarAvenida.Tablet
npm run build

# 4. Build limpio del backend
cd F:\BarAvenida\BarAvenida.API
dotnet build
```

**Criterios:** los 3 builds deben quedar **0 errors, 0 warnings**.
Si hay warnings/errors, parar y reportar a Cowork.

## 3. Setup del entorno de prueba

1. Levantar backend: `cd F:\BarAvenida\BarAvenida.API && dotnet run`
2. Levantar tablet: `cd F:\BarAvenida\BarAvenida.Tablet && npm run dev`
3. Levantar admin: `cd F:\BarAvenida\BarAvenida.Admin && npm run dev`
4. Login Tablet con mesera `23` / PIN `0001` (ABBY GZZ)
5. Login Admin con `ADMIN` / PIN `1234`

## 4. Pruebas funcionales

### Caso 1 — Solicitud de cancelación de PRODUCTOS (1-2 items)

**Pasos:**
1. En la tablet, abrir Mesa 1 (vacía).
2. Agregar 3 productos cualesquiera (ej. 2× Corona, 1× Tequila Don Julio).
3. Enviar al KDS.
4. Marcar 2 productos con checkbox para cancelar.
5. Seleccionar motivo del dropdown (ej. "Pedido equivocado").
6. Presionar **📤 SOLICITAR CANCELACIÓN**.

**Verificar en TABLET:**
- [ ] Mesa 1 se vuelve **morada** con texto "🔔 SOLICITUD".
- [ ] Mesa NO se puede abrir/clickear mientras está en este estado.

**Verificar en ADMIN (sin recargar):**
- [ ] Badge rojo aparece en menú **VENTAS** con número "1" pulsando.
- [ ] Al abrir VENTAS, el item "🔔 Solicitudes pendientes" tiene un badge rojo "1" pegado.
- [ ] Al entrar a la pantalla "Solicitudes pendientes":
  - [ ] Aparece 1 card MORADA con tipo "📋 PRODUCTOS".
  - [ ] Card muestra: Folio, Mesa 1, mesera "ABBY GZZ", motivo, los 2 productos con cantidad y subtotal, monto total correcto.
  - [ ] Tiempo "esperando" muestra ~0-1 min.

### Caso 2 — APROBAR la solicitud anterior

**Pasos:**
1. En el admin, click **✓ APROBAR**.
2. Confirmar en el modal "SÍ, APROBAR".

**Verificar en ADMIN:**
- [ ] Card desaparece inmediatamente de la lista.
- [ ] Toast verde "✅ Solicitud APROBADA — productos cancelados".
- [ ] Badge contador rojo desaparece (pasa a 0).
- [ ] Pantalla muestra estado vacío "Sin solicitudes pendientes".

**Verificar en TABLET:**
- [ ] Mesa 1 vuelve a estado **amarillo** (mía con cuenta abierta).
- [ ] Al abrir Mesa 1, los 2 productos cancelados YA NO ESTÁN.
- [ ] El producto restante (1× Corona) sí sigue.
- [ ] El total bajó correctamente.

### Caso 3 — Solicitud de cancelación de CUENTA COMPLETA + RECHAZAR

**Pasos:**
1. En la tablet, en Mesa 1 con la Corona restante, presionar "Solicitar cancelación de cuenta".
2. Motivo: "Cliente se fue".
3. Enviar.

**Verificar en TABLET:**
- [ ] Mesa 1 se vuelve **morada** con "🔔 SOLICITUD".

**Verificar en ADMIN:**
- [ ] Badge contador rojo aparece "1" pulsando.
- [ ] En la pantalla, aparece card ROJA con tipo "🚫 CUENTA COMPLETA".
- [ ] Card muestra el warning "⚠ Se cancelará la cuenta completa".

**Pasos (rechazar):**
4. Click **✕ RECHAZAR**.
5. Confirmar "SÍ, RECHAZAR".

**Verificar en ADMIN:**
- [ ] Card desaparece, toast "🚫 Solicitud RECHAZADA — productos conservados".
- [ ] Badge desaparece.

**Verificar en TABLET:**
- [ ] Mesa 1 vuelve a estado **amarillo** (NO se canceló).
- [ ] La Corona sigue en la cuenta.

### Caso 4 — Multi-solicitud + auto-refresh

**Pasos:**
1. En la tablet, abrir 3 mesas distintas (Mesa 2, 3, 4).
2. En cada una, agregar productos y solicitar cancelación.

**Verificar en ADMIN:**
- [ ] Sin recargar, las 3 cards aparecen automáticamente.
- [ ] Badge contador muestra "3".
- [ ] Las 3 cards se ven simultáneamente.

**Pasos:**
3. Aprobar la primera.

**Verificar:**
- [ ] Badge baja a "2" inmediatamente.
- [ ] La card aprobada desaparece, las otras 2 quedan.

### Caso 5 — Reload del admin con solicitud pendiente

**Pasos:**
1. Con 1 solicitud pendiente activa, refrescar el admin (F5).
2. Login otra vez.

**Verificar:**
- [ ] El badge contador aparece desde el inicio (no espera SignalR).
- [ ] Al entrar a la pantalla, la solicitud sigue visible.

### Caso 6 — Edge cases

- [ ] Sin token / token inválido: el badge no rompe el header (queda en 0 silencioso).
- [ ] Backend caído: la pantalla muestra "Cargando..." → error bar arriba.
- [ ] SignalR desconectado: hay reconexión automática (ver consola del browser).

## 5. Reporte final

Si **TODO** queda en verde:
- [ ] Cerrar Fase 0 en `CLAUDE.md` (marcar B3 como `[x]`).
- [ ] Eliminar la nota de "🟡 Pendiente build" del CLAUDE.md.
- [ ] Avanzar a planeación de **PROMPT C** (caja inteligente).

Si algo falla:
- [ ] Anotar el caso, el error exacto y el archivo afectado.
- [ ] Pasar el reporte a Cowork para fix targeted.

## 6. Bonus — chequeos de regresión

Antes de cerrar Fase 0, validar que las pantallas existentes no se rompieron:
- [ ] Pantalla `Cuentas por cobrar` sigue funcionando (cobrar una cuenta normal).
- [ ] Dashboard sigue mostrando KPIs.
- [ ] Reportes siguen cargando.
- [ ] Login/logout normal.
