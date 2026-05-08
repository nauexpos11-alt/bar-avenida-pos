# FIXES Admin — Round 2

Continuación del spec `fixes_admin_round_1.md`. Aquí van los 3 fixes que quedaron pendientes con plan ya definido.

---

## FIX-6. Items deshabilitados en menús — agregar tooltip "Próximamente"

**Contexto:** varios items del menú top aparecen en gris sin explicación. Causa confusión al operador.

**Decisión:** dejarlos en gris (porque sí se planearán implementar), pero agregar tooltip `title="Próximamente"` para que al hover muestre el motivo.

**Items afectados (lista exhaustiva):**
- **CONFIGURACIÓN** → "Áreas de impresión de comandas"
- **CAJA** → "Abrir cajón de dinero"
- **VENTAS** → "Pago agrupado", "Servicio DOMICILIO", "Servicio RÁPIDO", "Imprimir nota de consumo", "Reimprimir folios", "Tarjeta de crédito"

**Implementación:**
1. Abrir `BarAvenida.Admin/src/components/TopMenuBar.jsx`.
2. Buscar el array de items o el JSX que renderiza cada item del menú.
3. Para cada item con la prop `disabled: true` (o equivalente), agregar `title="Próximamente"` al elemento.
4. Si la estructura es de objeto, agregar también un tooltip CSS opcional (clase `mi-tooltip` o similar) para mejor UX.

**Aceptación:**
- Hover sobre cualquier item en gris muestra "Próximamente" como tooltip nativo del browser.
- No se quita ningún item.
- Build 0/0.

---

## FIX-9. Reloj del Admin debe venir del servidor, no del cliente

**Contexto:** hoy el reloj usa `new Date()` del browser. Si una PC del bar tiene la hora desfasada, su pantalla muestra una hora distinta de la que registra el backend en BD. Eso confunde al ver cierres de caja, tickets, alertas.

**Decisión:** crear endpoint backend que devuelva la hora canónica del servidor; frontend pide esa hora al cargar, calcula `offset` con la hora local del browser, y desde ahí actualiza el reloj cada segundo aplicando el offset.

**Backend (nuevo):**

Crear `BarAvenida.API/Controllers/SistemaController.cs` (si no existe) o agregar al `AdminController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/sistema")]
public class SistemaController : ControllerBase
{
    [HttpGet("hora")]
    [AllowAnonymous]   // se usa antes de login para sincronizar
    public IActionResult GetHora()
    {
        var ahora = DateTime.Now;  // hora local del servidor
        return Ok(new
        {
            utc          = DateTime.UtcNow,
            local        = ahora,
            zonaHoraria  = TimeZoneInfo.Local.Id,
            offsetUtc    = TimeZoneInfo.Local.GetUtcOffset(ahora).TotalMinutes
        });
    }
}
```

**Frontend (nuevo hook):**

Crear `BarAvenida.Admin/src/hooks/useServerClock.js`:

```javascript
import { useEffect, useState, useRef } from 'react'
import { api } from '../api'

// Devuelve un Date que SIEMPRE refleja la hora del servidor.
// Calcula offset al cargar y reaplica cada segundo.
// Re-sincroniza con el servidor cada 5 minutos.
export function useServerClock() {
  const [ahora, setAhora] = useState(() => new Date())
  const offsetMs = useRef(0)
  const sincronizado = useRef(false)

  useEffect(() => {
    let cancelado = false

    async function sincronizar() {
      try {
        const t0 = Date.now()
        const resp = await fetch('/api/sistema/hora')
        const t1 = Date.now()
        const data = await resp.json()
        const latenciaIda = (t1 - t0) / 2
        const horaServidor = new Date(data.local).getTime() + latenciaIda
        const horaCliente  = Date.now()
        if (!cancelado) {
          offsetMs.current = horaServidor - horaCliente
          sincronizado.current = true
        }
      } catch (e) {
        // Si falla, dejamos offset = 0 (hora del cliente)
        console.warn('No se pudo sincronizar hora servidor:', e)
      }
    }

    sincronizar()
    const reSync = setInterval(sincronizar, 5 * 60 * 1000)  // cada 5 min
    const tick   = setInterval(() => {
      setAhora(new Date(Date.now() + offsetMs.current))
    }, 1000)

    return () => {
      cancelado = true
      clearInterval(reSync)
      clearInterval(tick)
    }
  }, [])

  return ahora
}
```

**Reemplazar usos del reloj:**

Buscar todos los lugares en `BarAvenida.Admin/src/` donde se usa `new Date().toLocaleTimeString` para el reloj de pantalla y reemplazar por:

```jsx
import { useServerClock } from '../hooks/useServerClock'
// ...
const ahora = useServerClock()
const horaStr = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
```

Probable archivo principal: `BarAvenida.Admin/src/components/TopMenuBar.jsx` (donde está el reloj del header).

**Aceptación:**
- Endpoint `GET http://localhost:7000/api/sistema/hora` devuelve JSON con `utc`, `local`, `zonaHoraria`, `offsetUtc`.
- El reloj del header del Admin sigue avanzando segundo a segundo.
- Si cambias manualmente la hora del sistema Windows (avanzas 10 min), el reloj del Admin **NO** cambia (porque viene del servidor).
- A los 5 minutos se re-sincroniza automático.
- Build 0/0.

---

## FIX-10. KPIs del Dashboard vivo con iconos SVG en lugar de `$`, `#`, `~`, `+`

**Contexto:** las 4 cards de KPIs en `DashboardLiveScreen.jsx` usan iconos abstractos sin sentido (`$`, `#`, `~`, `+`). Hay que cambiarlos por SVGs claros.

**Implementación:**

1. Abrir `BarAvenida.Admin/src/screens/DashboardLiveScreen.jsx`.
2. Buscar las 4 cards arriba (probablemente un componente `<KpiCard icono="$" ... />` o similar).
3. Reemplazar el render del icono por un `<svg>` inline o un `<use href="/icons.svg#nombre" />` apuntando a iconos del set existente en `BarAvenida.Admin/public/icons.svg`.

**Mapeo recomendado** (revisar qué iconos existen ya en `icons.svg`):

| KPI | Icono recomendado | Color sugerido |
|---|---|---|
| VENTAS HOY | bolsa de dinero / billete | dorado `#f0c842` |
| CUENTAS HOY | ticket / nota | rojo suave |
| TICKET PROMEDIO | calculadora / equals sign | verde |
| PRODUCTOS HOY | caja / inventario | gris claro |

Si no hay iconos adecuados en `icons.svg`, agregar nuevos del set de **lucide** (consistente con el resto del proyecto que ya usa lucide-react).

**Aceptación:**
- Las 4 cards de Dashboard vivo muestran iconos SVG claros, no caracteres ASCII.
- Los colores combinan con el tema dorado/negro.
- Build 0/0.

---

## Reglas duras

- 0 errors, 0 warnings al compilar.
- NO instalar librerías nuevas (los iconos SVG van inline o con `<use href>`).
- Mantener el tema dorado/negro.
- Para FIX-9: el endpoint `/api/sistema/hora` debe ser AllowAnonymous (lo usa el LoginScreen también).

## Aceptación global

Después de aplicar los 3 fixes, hacer:
```powershell
F:\BarAvenida\Scripts\deploy-admin.ps1
```

Y validar con Chrome MCP (yo me encargo de eso después).

## Archivos esperados al cierre

- Modificados:
  - `BarAvenida.Admin/src/components/TopMenuBar.jsx` (FIX-6 tooltips)
  - `BarAvenida.Admin/src/screens/DashboardLiveScreen.jsx` (FIX-10 iconos)
- Nuevos:
  - `BarAvenida.API/Controllers/SistemaController.cs` (FIX-9 backend)
  - `BarAvenida.Admin/src/hooks/useServerClock.js` (FIX-9 hook)
- Tocados (para usar el hook):
  - `BarAvenida.Admin/src/components/TopMenuBar.jsx` (también — el reloj del header)
  - Otros archivos donde haya `toLocaleTimeString` para reloj de pantalla
