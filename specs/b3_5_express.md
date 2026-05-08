# SPEC B3.5 EXPRESS — Validación rápida B3 (10 min)

> Versión condensada del spec completo, enfocada en los 3 casos críticos.

---

## Setup (1 min)

```powershell
cd F:\BarAvenida
.\dev-start.ps1
```

Espera ~10 segundos. Verifica que las 3 ventanas no muestren errores rojos.

**Login:**
- Tablet (`http://localhost:3002`): mesera `23` / PIN `0001`
- Admin (puerto que te diga Vite): `ADMIN` / PIN `1234`

## ✓ Caso A — Cancelación de productos + APROBAR (4 min)

1. **Tablet:** Abre Mesa 1, agrega 3 productos cualesquiera, manda al KDS.
2. **Tablet:** Marca 2 productos con checkbox, motivo "Pedido equivocado", presiona 📤 SOLICITAR CANCELACIÓN.
3. **Tablet:** ¿Mesa 1 se vuelve **morada**? ✅/❌
4. **Admin (sin tocar nada):** ¿Aparece badge rojo "1" pulsando en el menú VENTAS? ✅/❌
5. **Admin:** Click VENTAS → 🔔 Solicitudes pendientes. ¿Card morada con los 2 productos correctos? ✅/❌
6. **Admin:** Click ✓ APROBAR → confirma.
7. **Admin:** ¿Card desaparece + toast verde + badge baja a 0? ✅/❌
8. **Tablet:** ¿Mesa 1 vuelve a amarillo + ya solo tiene 1 producto en la cuenta? ✅/❌

## ✓ Caso B — Cancelación de cuenta completa + RECHAZAR (3 min)

1. **Tablet:** En Mesa 1 (con el producto restante), botón "Solicitar cancelación de cuenta", motivo "Cliente se fue".
2. **Tablet:** ¿Mesa 1 morada con SOLICITUD? ✅/❌
3. **Admin:** ¿Aparece card ROJA "🚫 CUENTA COMPLETA" con warning? ✅/❌
4. **Admin:** Click ✕ RECHAZAR → confirma.
5. **Admin:** ¿Card desaparece + toast rojizo? ✅/❌
6. **Tablet:** ¿Mesa 1 vuelve a amarillo + producto sigue intacto? ✅/❌

## ✓ Caso C — Multi-solicitud + reload (2 min)

1. **Tablet:** Crea 2 solicitudes en mesas distintas (Mesa 2 y Mesa 3).
2. **Admin:** ¿Badge muestra "2"? ¿Las 2 cards aparecen sin recargar? ✅/❌
3. **Admin:** F5 (reload) y login otra vez.
4. **Admin:** ¿Badge "2" aparece desde el inicio? ¿Las 2 solicitudes siguen visibles? ✅/❌
5. **Cleanup:** Aprueba o rechaza ambas para dejar limpio.

## Reporte

Pega aquí los ✅/❌ de cada caso. Si algún paso falla, dime:
- Qué hiciste exactamente
- Qué viste (screenshot ideal)
- Qué error muestra la consola del browser (F12 → Console)
