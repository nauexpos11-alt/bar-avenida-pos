# SPEC G — Smart Suggestions (Cross-sell)

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork con nombres reales del proyecto
> **CON migración EF**, sin librerías nuevas
> **Sesión estimada:** 3-4h Claude Code (la última de Fase 2)

---

## 1. Objetivo

Cuando una mesera agrega un producto al carrito en la tablet, el sistema le
sugiere productos complementarios para vender más. Ej: agrega "Corona" →
sugiere "Cacahuates Botanas" y "Salsa Valentina". La mesera ve las
sugerencias inline y puede agregarlas con un solo click.

**Impacto:** sube el ticket promedio. Las reglas las configura el admin
desde una pantalla nueva con CRUD.

## 2. Decisiones tomadas

1. **Reglas estáticas configuradas por admin** (no IA todavía — eso queda para Fase 3 con Ollama/Claude API). Tabla simple `ReglaCrossSell { ProductoOrigenId, ProductoSugeridoId, Prioridad, Activo }`.

2. **Hasta 3 sugerencias por producto** (mostradas como chips horizontales). Si hay más reglas activas, se muestran las 3 con menor `Prioridad`.

3. **No persistir "sugerencia aceptada/rechazada"** todavía. Mantenerlo simple. Si más adelante quieres analytics, agregamos campo `Aceptada` a OrdenDetalle.

4. **Reglas son unidireccionales:** "Corona → Cacahuates" NO implica "Cacahuates → Corona". El admin debe crear las dos reglas si las quiere bidireccionales.

5. **No mostrar sugerencias para productos ya en el carrito** (filtro frontend).

## 3. Backend

### 3.1 Modelo nuevo: `ReglaCrossSell`

`F:\BarAvenida\BarAvenida.API\Models\ReglaCrossSell.cs`:
```csharp
using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class ReglaCrossSell
{
    public int Id { get; set; }

    public int ProductoOrigenId { get; set; }
    public Producto? ProductoOrigen { get; set; }

    public int ProductoSugeridoId { get; set; }
    public Producto? ProductoSugerido { get; set; }

    /// <summary>Orden de prioridad. Menor número = mayor prioridad. Default 100.</summary>
    public int Prioridad { get; set; } = 100;

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.Now;
}
```

### 3.2 DbContext

En `F:\BarAvenida\BarAvenida.API\Data\BarAvenidaDbContext.cs`:

```csharp
public DbSet<ReglaCrossSell> ReglasCrossSell { get; set; }
```

Y en `OnModelCreating` agregar FKs con NoAction (mismo patrón que SolicitudCancelacion):

```csharp
modelBuilder.Entity<ReglaCrossSell>()
    .HasOne(r => r.ProductoOrigen).WithMany().HasForeignKey(r => r.ProductoOrigenId)
    .OnDelete(DeleteBehavior.NoAction);

modelBuilder.Entity<ReglaCrossSell>()
    .HasOne(r => r.ProductoSugerido).WithMany().HasForeignKey(r => r.ProductoSugeridoId)
    .OnDelete(DeleteBehavior.NoAction);

// Índice único: no permitir la misma regla duplicada
modelBuilder.Entity<ReglaCrossSell>()
    .HasIndex(r => new { r.ProductoOrigenId, r.ProductoSugeridoId })
    .IsUnique();
```

### 3.3 Migración

```powershell
taskkill /F /IM BarAvenida.API.exe /T
cd F:\BarAvenida\BarAvenida.API
dotnet ef migrations add ReglasCrossSell
dotnet ef database update
```

Verificar que la migración solo agrega la tabla `ReglasCrossSell` con los 2 FKs y el índice único.

### 3.4 DTOs

`F:\BarAvenida\BarAvenida.API\DTOs\ReglaCrossSellDtos.cs`:

```csharp
namespace BarAvenida.API.DTOs;

public class ReglaCrossSellDto
{
    public int    Id                     { get; set; }
    public int    ProductoOrigenId       { get; set; }
    public string ProductoOrigenNombre   { get; set; } = "";
    public int    ProductoSugeridoId     { get; set; }
    public string ProductoSugeridoNombre { get; set; } = "";
    public decimal ProductoSugeridoPrecio { get; set; }
    public int    Prioridad              { get; set; }
    public bool   Activo                 { get; set; }
}

public class CrearReglaCrossSellDto
{
    public int ProductoOrigenId   { get; set; }
    public int ProductoSugeridoId { get; set; }
    public int Prioridad          { get; set; } = 100;
    public bool Activo            { get; set; } = true;
}

public class ActualizarReglaCrossSellDto
{
    public int  Prioridad { get; set; }
    public bool Activo    { get; set; }
}

public class SugerenciaProductoDto
{
    public int     ProductoId { get; set; }
    public string  Nombre     { get; set; } = "";
    public decimal Precio     { get; set; }
}
```

### 3.5 Controller nuevo: `ReglasCrossSellController`

`F:\BarAvenida\BarAvenida.API\Controllers\ReglasCrossSellController.cs`:

```csharp
using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Authorize]
public class ReglasCrossSellController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public ReglasCrossSellController(BarAvenidaDbContext db) => _db = db;

    // ── Admin: lista todas ───────────────────────────────────────────────────
    [HttpGet("/api/admin/reglas-crosssell")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Listar()
    {
        var reglas = await _db.ReglasCrossSell
            .Include(r => r.ProductoOrigen)
            .Include(r => r.ProductoSugerido)
            .OrderBy(r => r.ProductoOrigen!.Nombre)
            .ThenBy(r => r.Prioridad)
            .Select(r => new ReglaCrossSellDto {
                Id                     = r.Id,
                ProductoOrigenId       = r.ProductoOrigenId,
                ProductoOrigenNombre   = r.ProductoOrigen!.Nombre,
                ProductoSugeridoId     = r.ProductoSugeridoId,
                ProductoSugeridoNombre = r.ProductoSugerido!.Nombre,
                ProductoSugeridoPrecio = r.ProductoSugerido.Precio,
                Prioridad              = r.Prioridad,
                Activo                 = r.Activo,
            })
            .ToListAsync();

        return Ok(reglas);
    }

    // ── Admin: crear ─────────────────────────────────────────────────────────
    [HttpPost("/api/admin/reglas-crosssell")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Crear([FromBody] CrearReglaCrossSellDto dto)
    {
        if (dto.ProductoOrigenId == dto.ProductoSugeridoId)
            return BadRequest(new { mensaje = "Origen y sugerido no pueden ser el mismo producto." });

        var existe = await _db.ReglasCrossSell.AnyAsync(r =>
            r.ProductoOrigenId == dto.ProductoOrigenId &&
            r.ProductoSugeridoId == dto.ProductoSugeridoId);
        if (existe) return Conflict(new { mensaje = "Esta regla ya existe." });

        var regla = new ReglaCrossSell {
            ProductoOrigenId   = dto.ProductoOrigenId,
            ProductoSugeridoId = dto.ProductoSugeridoId,
            Prioridad          = dto.Prioridad,
            Activo             = dto.Activo,
        };
        _db.ReglasCrossSell.Add(regla);
        await _db.SaveChangesAsync();

        return Ok(new { id = regla.Id });
    }

    // ── Admin: actualizar (prioridad, activo) ────────────────────────────────
    [HttpPut("/api/admin/reglas-crosssell/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Actualizar(int id, [FromBody] ActualizarReglaCrossSellDto dto)
    {
        var regla = await _db.ReglasCrossSell.FindAsync(id);
        if (regla == null) return NotFound();

        regla.Prioridad = dto.Prioridad;
        regla.Activo    = dto.Activo;
        await _db.SaveChangesAsync();

        return Ok();
    }

    // ── Admin: eliminar ──────────────────────────────────────────────────────
    [HttpDelete("/api/admin/reglas-crosssell/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var regla = await _db.ReglasCrossSell.FindAsync(id);
        if (regla == null) return NotFound();

        _db.ReglasCrossSell.Remove(regla);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── Tablet: sugerencias para un producto ─────────────────────────────────
    [HttpGet("/api/Productos/{id}/sugerencias")]
    public async Task<IActionResult> Sugerencias(int id)
    {
        var sugerencias = await _db.ReglasCrossSell
            .Where(r => r.ProductoOrigenId == id && r.Activo)
            .Include(r => r.ProductoSugerido)
            .Where(r => r.ProductoSugerido!.Activo)
            .OrderBy(r => r.Prioridad)
            .Take(3)
            .Select(r => new SugerenciaProductoDto {
                ProductoId = r.ProductoSugeridoId,
                Nombre     = r.ProductoSugerido!.Nombre,
                Precio     = r.ProductoSugerido.Precio,
            })
            .ToListAsync();

        return Ok(sugerencias);
    }
}
```

## 4. Frontend Admin

### 4.1 `api.js`

Agregar al objeto `api`:

```javascript
adminGetReglasCrossSell:    (t)         => req('/api/admin/reglas-crosssell', {}, t),
adminCrearReglaCrossSell:   (t, dto)    => req('/api/admin/reglas-crosssell', { method: 'POST', body: JSON.stringify(dto) }, t),
adminUpdateReglaCrossSell:  (t, id, dto)=> req(`/api/admin/reglas-crosssell/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
adminDeleteReglaCrossSell:  (t, id)     => req(`/api/admin/reglas-crosssell/${id}`, { method: 'DELETE' }, t),
```

### 4.2 Pantalla nueva: `ReglasCrossSellScreen.jsx`

`F:\BarAvenida\BarAvenida.Admin\src\screens\ReglasCrossSellScreen.jsx`:

Layout esperado:
- Header con botón VOLVER y título "REGLAS DE SUGERENCIAS (CROSS-SELL)"
- Botón "+ Nueva regla" arriba a la derecha
- Tabla con columnas: PRODUCTO ORIGEN, →, PRODUCTO SUGERIDO, PRECIO, PRIORIDAD, ACTIVO (toggle), ACCIONES (eliminar)
- Modal "Nueva regla" con 2 selects (origen, sugerido) cargados de `api.adminGetProductos` + input numérico Prioridad + checkbox Activo

Estilos: usar tema dorado/negro. Patrón visual similar a `MesasScreen` o `MeserosScreen` (revisar para consistencia).

CSS: `ReglasCrossSellScreen.css` con prefijo `.rcs-`.

### 4.3 Item en TopMenuBar

En `components/TopMenuBar.jsx`, dentro del menú **CATÁLOGOS**, agregar entre 'Productos para venta' y 'Meseros / Repartidores':

```javascript
{ label: '🎯 Reglas de sugerencias',  screen: 'cat-reglas-crosssell' },
```

### 4.4 Ruta en `App.jsx`

```jsx
case 'cat-reglas-crosssell':
  return <ReglasCrossSellScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
```

(Recuerda agregar el import del componente arriba.)

## 5. Frontend Tablet

### 5.1 `api.js` de la Tablet

Agregar:
```javascript
getSugerencias: (t, productoId) => req(`/api/Productos/${productoId}/sugerencias`, {}, t),
```

### 5.2 `CuentaScreen.jsx` — integración de sugerencias

En `F:\BarAvenida\BarAvenida.Tablet\src\screens\CuentaScreen.jsx`:

1. **Estado nuevo:**
```javascript
const [sugerencias, setSugerencias] = useState([])
```

2. **Cuando se agrega un producto al carrito**, hacer fetch de sugerencias:
```javascript
const handleAgregarProducto = (producto) => {
  // ... código existente que agrega al carrito ...

  // PROMPT G — pedir sugerencias para este producto
  api.getSugerencias(auth.token, producto.id)
    .then(s => setSugerencias(Array.isArray(s) ? s : []))
    .catch(() => setSugerencias([]))
}
```

3. **Filtrar sugerencias** que ya estén en el carrito (frontend):
```javascript
const sugerenciasVisibles = sugerencias.filter(s =>
  !carrito.some(item => item.id === s.productoId)
)
```

4. **Banner inline** entre el carrito y el panel de productos. Aparece cuando `sugerenciasVisibles.length > 0`:

```jsx
{sugerenciasVisibles.length > 0 && (
  <div className="cs-sugerencias">
    <span className="cs-sug-label">💡 También sugerimos:</span>
    <div className="cs-sug-chips">
      {sugerenciasVisibles.map(s => (
        <button
          key={s.productoId}
          className="cs-sug-chip"
          onClick={() => handleAgregarProducto({
            id:     s.productoId,
            nombre: s.nombre,
            precio: s.precio,
          })}
        >
          <span className="cs-sug-nombre">{s.nombre}</span>
          <span className="cs-sug-precio">+${s.precio.toFixed(2)}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

5. **Limpiar sugerencias** cuando se manda al KDS (ACEPTAR) o se cancela (CANCELA):
```javascript
setSugerencias([])
```

### 5.3 CSS para sugerencias en Tablet

En `CuentaScreen.css` agregar al final:

```css
/* ═══════════════════════════════════════
   PROMPT G — Sugerencias inline
   ═══════════════════════════════════════ */
.cs-sugerencias {
  background: linear-gradient(180deg, #1a1500 0%, #0f0f0f 100%);
  border: 1px solid #a0820d;
  border-radius: 6px;
  padding: 8px 10px;
  margin: 6px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: csSugIn 0.22s ease-out;
}

@keyframes csSugIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.cs-sug-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #f0c842;
  white-space: nowrap;
  flex-shrink: 0;
}

.cs-sug-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.cs-sug-chip {
  background: #1a1400;
  border: 1px solid #a0820d;
  color: #f0c842;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.12s, transform 0.08s;
}
.cs-sug-chip:hover  { background: #2a2400; }
.cs-sug-chip:active { background: #1a1400; transform: scale(0.97); }

.cs-sug-nombre { color: #ddd; }
.cs-sug-precio {
  color: #f0c842;
  font-variant-numeric: tabular-nums;
  font-weight: 900;
}
```

## 6. Criterios de aceptación

### Backend
- [ ] Migración `ReglasCrossSell` aplicada limpio (`dotnet ef database update`).
- [ ] CRUD admin: GET, POST, PUT, DELETE funcionan con autorización Admin.
- [ ] Crear regla con `ProductoOrigenId == ProductoSugeridoId` retorna HTTP 400.
- [ ] Crear regla duplicada retorna HTTP 409 (índice único).
- [ ] `GET /api/Productos/{id}/sugerencias` retorna máximo 3, ordenadas por prioridad, solo activas y con producto sugerido activo.
- [ ] **Build backend en 0/0**.

### Frontend Admin
- [ ] Pantalla "Reglas de sugerencias" accesible desde menú CATÁLOGOS.
- [ ] Tabla muestra reglas con productos resueltos a nombres.
- [ ] Modal "Nueva regla" con selects funcionales (cargados de `adminGetProductos`).
- [ ] Toggle "Activo" funciona y persiste.
- [ ] Eliminar regla con confirmación.
- [ ] **Build admin en 0/0**.

### Frontend Tablet
- [ ] Al agregar producto al carrito, aparece banner "💡 También sugerimos: …" si hay reglas activas.
- [ ] Chips muestran nombre + precio (+$XX.XX).
- [ ] Click en chip agrega ese producto al carrito y muestra sugerencias del nuevo producto.
- [ ] Productos ya en carrito NO aparecen como sugerencia.
- [ ] Sugerencias se limpian al ACEPTAR (mandar al KDS) o CANCELAR.
- [ ] **Build tablet en 0/0**.

## 7. Pruebas manuales (después de implementar)

1. **Setup admin:**
   - Caja → Catálogos → Reglas de sugerencias
   - Crear regla: Corona → Cacahuates Botanas, prioridad 10, activo ✓
   - Crear regla: Corona → Salsa Valentina, prioridad 20, activo ✓
   - Crear regla: Corona → Tequila Don Julio, prioridad 30, activo ✓

2. **Tablet — flujo:**
   - Login mesera, abrir Mesa libre.
   - Click en "Corona" → se agrega al carrito.
   - **Verificar:** banner aparece con 3 chips "Cacahuates +$XX", "Salsa +$XX", "Tequila +$XX".
   - Click en "Cacahuates Botanas" → se agrega al carrito, banner se actualiza con sugerencias de Cacahuates (si las tiene, sino se vacía).
   - Cancelar → banner desaparece.

3. **Edge cases:**
   - Crear regla origen=sugerido → HTTP 400 con toast de error.
   - Crear regla duplicada → HTTP 409.
   - Producto sin reglas → no aparece banner.
   - Toggle activo=false → la regla deja de aparecer en sugerencias.

## 8. Reglas de oro

- **NO** instalar librerías nuevas.
- **NO** ejecutar `dotnet run` ni `npm run dev`.
- Antes de modificar el backend: `taskkill /F /IM BarAvenida.API.exe /T`.
- Si truena MSB4018: clean bin/obj y rebuild.
- Builds finales en **0 errors, 0 warnings** (Backend, Admin, Tablet).
- Cuando termines, reportar:
  - Lista de archivos modificados/creados
  - Resultado de los 3 builds
  - Resultado de la migración EF
  - Cualquier decisión de diseño que tomaste

## 9. Archivos esperados (resumen)

| Archivo | Acción | Aprox |
|---|---|---|
| `Models/ReglaCrossSell.cs` | NUEVO | ~25 líneas |
| `Data/BarAvenidaDbContext.cs` | Modificar (+1 DbSet, +3 configuraciones) | +18 |
| `Migrations/*_ReglasCrossSell.{cs,Designer.cs}` | NUEVOS auto-generados | ~50 |
| `DTOs/ReglaCrossSellDtos.cs` | NUEVO | ~40 |
| `Controllers/ReglasCrossSellController.cs` | NUEVO | ~115 |
| `BarAvenida.Admin/src/api.js` | Modificar | +5 |
| `BarAvenida.Admin/src/screens/ReglasCrossSellScreen.jsx` | NUEVO | ~200 |
| `BarAvenida.Admin/src/screens/ReglasCrossSellScreen.css` | NUEVO | ~120 |
| `BarAvenida.Admin/src/components/TopMenuBar.jsx` | Modificar (+1 item) | +1 |
| `BarAvenida.Admin/src/App.jsx` | Modificar (+1 case + import) | +3 |
| `BarAvenida.Tablet/src/api.js` | Modificar | +1 |
| `BarAvenida.Tablet/src/screens/CuentaScreen.jsx` | Modificar | +30 |
| `BarAvenida.Tablet/src/screens/CuentaScreen.css` | Modificar | +60 |

**Total: ~670 líneas, 5 archivos nuevos, 1 migración, 0 librerías nuevas.**
