# SPEC — Correcciones Tablet Meseras v1

**Fecha:** 2026-05-08
**Owner:** Coronado
**Origen:** documento "Esta es la correcion de la interfaz de meseras.docx" + 8 capturas
**Stack afectado:** BarAvenida.Tablet (React + Vite, puerto 3002 dev, deploy a `wwwroot/tablet`)

---

## Objetivo

Dejar la app de Tablet de meseras profesional, limpia, sin elementos que no sirvan para meseras (la barra es del admin/bartender, NO de meseras).

Después de este spec, Coronado valida visualmente desde su celular en `http://192.168.100.10:7000/tablet/`.

---

## Reglas globales

1. **NO instalar paquetes nuevos.** Todo con lo que ya existe en `package.json`.
2. **NO ejecutar `npm run dev`.** Solo `npm run build` para validar.
3. **Build con 0 errors y 0 warnings.**
4. **NO borrar archivos JSX/CSS aunque queden sin uso.** Solo quitar imports y referencias.
5. **Conservar:** `BarraRapidaScreen.jsx` y su CSS (después se mueve al Admin, en otro spec).
6. **Tema dorado #f0c842 + negro #0a0a0a.** Mantener la línea visual existente.
7. **Antes de tocar el backend:** `taskkill /F /IM BarAvenida.API.exe /T` (NO aplica aquí, este spec es 100% frontend Tablet).
8. **Después del build:** copiar `dist/*` a `F:\BarAvenida\BarAvenida.API\wwwroot\tablet\`.

---

## CAMBIO 1 — Modal "Abrir Cuenta" con ÁREA y MESA editables

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\components\AbrirMesaModal.jsx`
**CSS:** `F:\BarAvenida\BarAvenida.Tablet\src\components\AbrirMesaModal.css`

### Estado actual

ÁREA y MESA aparecen bloqueados con icono de candado. La mesera no puede cambiar la selección si tappeó la mesa equivocada.

### Estado deseado

- ÁREA: dropdown editable con SOLO `Comedor` y `Terraza` (excluir `Barra`).
- MESA: dropdown editable con las mesas LIBRES del área seleccionada.
- Al cambiar el ÁREA, recargar la lista de MESAS disponibles.
- Default: el área y mesa que la mesera ya seleccionó al tappear.

### Cambios técnicos

**1. Recibir lista de mesas como prop:**

```jsx
// MesasScreen.jsx - linea 327-334
{modalMesa && (
  <AbrirMesaModal
    mesa={modalMesa}
    mesasDisponibles={mesas}   // NUEVO: pasar todas las mesas
    auth={auth}
    onExito={...}
    onCancelar={...}
  />
)}
```

**2. AbrirMesaModal.jsx - rediseñar el body:**

```jsx
import { useState, useMemo } from 'react'

const AREAS_VALIDAS = ['Comedor', 'Terraza']  // Barra excluida

export default function AbrirMesaModal({ mesa, mesasDisponibles, auth, onExito, onCancelar }) {
  // Normalizar el area inicial: si la mesa pertenece a Barra, default a Comedor
  const areaInicial = AREAS_VALIDAS.includes(mesa.areaNombre) ? mesa.areaNombre : 'Comedor'

  const [areaSel, setAreaSel] = useState(areaInicial)
  const [mesaSelId, setMesaSelId] = useState(mesa.id)
  const [personas, setPersonas] = useState(2)
  const [showPersonas, setShowPersonas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Mesas LIBRES del area seleccionada
  const mesasDelArea = useMemo(() => {
    return (mesasDisponibles || [])
      .filter(m =>
        (m.areaNombre ?? '').toLowerCase() === areaSel.toLowerCase() &&
        m.estado !== 'Ocupada' &&
        !m.cuentaActivaId &&
        !m.cuentaId
      )
      .sort((a, b) => Number(a.numero) - Number(b.numero))
  }, [mesasDisponibles, areaSel])

  // Si la mesa actualmente seleccionada ya no esta en el area, tomar la primera disponible
  useEffect(() => {
    if (!mesasDelArea.find(m => m.id === mesaSelId)) {
      setMesaSelId(mesasDelArea[0]?.id ?? null)
    }
  }, [areaSel, mesasDelArea])

  const handleAbrir = async () => {
    if (!mesaSelId) { setError('Selecciona una mesa'); return }
    setLoading(true)
    setError(null)
    try {
      const cuenta = await api.abrirCuenta(auth.token, {
        mesaId: mesaSelId,                 // Usa el seleccionado, NO el de mesa.id
        meseraId: auth.id,
        numeroPersonas: personas,
      })
      onExito(cuenta)
    } catch (e) {
      setError(e.message || 'No se pudo abrir la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const mesaActual = mesasDelArea.find(m => m.id === mesaSelId) ?? mesa

  return (
    <>
      <div className="am-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
        <div className="am-box">

          <div className="am-header">
            <div className="am-title">ABRIR CUENTA — MESA {mesaActual.numero}</div>
            <div className="am-subtitle">Captura los datos de la cuenta nueva</div>
          </div>

          <div className="am-body">

            {/* AREA editable - SELECT */}
            <label className="am-campo am-campo-select">
              <span className="am-label">ÁREA</span>
              <select
                className="am-select"
                value={areaSel}
                onChange={e => setAreaSel(e.target.value)}
                disabled={loading}
              >
                {AREAS_VALIDAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <span className="am-chevron">▾</span>
            </label>

            {/* MESA editable - SELECT */}
            <label className="am-campo am-campo-select">
              <span className="am-label">MESA</span>
              <select
                className="am-select"
                value={mesaSelId ?? ''}
                onChange={e => setMesaSelId(Number(e.target.value))}
                disabled={loading || mesasDelArea.length === 0}
              >
                {mesasDelArea.length === 0 && (
                  <option value="">— sin mesas libres —</option>
                )}
                {mesasDelArea.map(m => (
                  <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                ))}
              </select>
              <span className="am-chevron">▾</span>
            </label>

            {/* PERSONAS - igual que antes */}
            <button className="am-campo" onClick={() => setShowPersonas(true)}>
              <span className="am-label">NÚMERO DE PERSONAS</span>
              <span className="am-valor">
                {personas} {personas === 1 ? 'PERSONA' : 'PERSONAS'}
              </span>
              <span className="am-chevron">›</span>
            </button>

          </div>

          {error && <div className="am-error">⚠ {error}</div>}

          <div className="am-footer">
            <button className="am-btn-cancelar" onClick={onCancelar} disabled={loading}>
              CANCELAR
            </button>
            <button
              className="am-btn-abrir"
              onClick={handleAbrir}
              disabled={loading || !mesaSelId}
            >
              {loading ? 'ABRIENDO...' : 'ABRIR MESA'}
            </button>
          </div>

        </div>
      </div>

      {showPersonas && (
        <NumPad
          titulo="NÚMERO DE PERSONAS"
          valorInicial={personas}
          valorMinimo={1}
          valorMaximo={30}
          onAceptar={v => { setPersonas(v); setShowPersonas(false) }}
          onCancelar={() => setShowPersonas(false)}
        />
      )}
    </>
  )
}
```

**3. CSS para los nuevos selects** (agregar al final de `AbrirMesaModal.css`):

```css
.am-campo-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.am-campo-select:hover {
  border-color: #f0c842;
}
.am-select {
  flex: 1;
  background: transparent;
  border: none;
  color: #f0c842;
  font-size: 1.15rem;
  font-weight: 600;
  font-family: inherit;
  text-align: right;
  padding-right: 12px;
  cursor: pointer;
  appearance: none;
}
.am-select:focus {
  outline: none;
}
.am-select option {
  background: #1a1a1a;
  color: #f0c842;
  padding: 8px;
}
.am-campo-select .am-chevron {
  color: #f0c842;
  font-size: 1.2rem;
  pointer-events: none;
}
```

NO eliminar las clases `am-campo-readonly` ni `am-ico-lock` del CSS — quedan sin uso pero se conservan por la regla #4.

---

## CAMBIO 2 — Quitar "BARRA RÁPIDA" del top bar de la Tablet

**Archivos:**
- `F:\BarAvenida\BarAvenida.Tablet\src\screens\MesasScreen.jsx`
- `F:\BarAvenida\BarAvenida.Tablet\src\App.jsx`

### MesasScreen.jsx

Eliminar el botón completo (líneas 207-214):

```jsx
// BORRAR este bloque:
<button
  className="action-btn action-btn-barra"
  onClick={() => onIrBarra?.()}
  style={{ border: '1px solid #f0c842', color: '#f0c842' }}
>
  <span style={{ fontSize: '1.1rem' }}>🍺</span>
  <span>BARRA RÁPIDA</span>
</button>
```

También quitar `onIrBarra` de los props (línea 21) y de cualquier referencia interna.

### App.jsx

- Línea 11: borrar `import BarraRapidaScreen from './screens/BarraRapidaScreen'`
- Línea 96: borrar `const handleIrBarra = () => setScreen('barra-rapida')`
- Línea 124: borrar `onIrBarra={handleIrBarra}` del MesasScreen props
- Líneas 160-167: borrar el bloque del screen 'barra-rapida'

**NO borrar el archivo `BarraRapidaScreen.jsx`** ni su CSS. Se conservan para reutilizar en el Admin después.

---

## CAMBIO 3 — Quitar "BARRA" del filtro de áreas

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\screens\MesasScreen.jsx`

Línea 8:

```jsx
// ANTES:
const AREAS = ['TODAS LAS ÁREAS', 'COMEDOR', 'TERRAZA', 'BARRA']

// DESPUÉS:
const AREAS = ['TODAS LAS ÁREAS', 'COMEDOR', 'TERRAZA']
```

Si una mesera tappea con un usuario que tiene mesas con área 'BARRA', no se muestran en filtros pero sí en 'TODAS LAS ÁREAS'. Esto es correcto temporalmente — la mesera no debería atender esas mesas, pero las ve para no perder visibilidad de inventario de mesas.

---

## CAMBIO 4 — Mesa con cancelación pendiente: color MORADO + texto explícito

**Archivos:**
- `F:\BarAvenida\BarAvenida.Tablet\src\screens\MesasScreen.jsx`
- `F:\BarAvenida\BarAvenida.Tablet\src\screens\MesasScreen.css`

### Estado actual

Cuando hay solicitud de cancelación, la mesa se marca con clase `mesa-con-solicitud` y muestra "🔔 SOLICITUD".

### Estado deseado

- Fondo MORADO (#a020f0 sobre negro, con borde más intenso #b85cff)
- Texto "PENDIENTE DE CANCELACIÓN" en lugar de "🔔 SOLICITUD"
- Mantener visible: número de mesa, nombre de la mesera, total
- Animación sutil de pulso para llamar la atención

### MesasScreen.jsx — línea 167

```jsx
// ANTES:
<span className="mesa-estado-txt txt-solicitud">🔔 SOLICITUD</span>

// DESPUÉS:
<span className="mesa-estado-txt txt-solicitud">PENDIENTE DE<br/>CANCELACIÓN</span>
```

### MesasScreen.css — agregar/modificar

Buscar la clase `.mesa-con-solicitud` y reemplazar/agregar:

```css
.mesa-card.mesa-con-solicitud {
  background: linear-gradient(135deg, #2a0d3d 0%, #1a0825 100%);
  border: 2px solid #b85cff;
  box-shadow: 0 0 12px rgba(184, 92, 255, 0.4), inset 0 0 8px rgba(184, 92, 255, 0.15);
  animation: pulse-purple 2s ease-in-out infinite;
}

.mesa-card.mesa-con-solicitud .mesa-numero {
  color: #d18cff;
}

.mesa-card.mesa-con-solicitud .mesa-mesera {
  color: #b85cff;
  font-weight: 600;
}

.mesa-card.mesa-con-solicitud .mesa-monto-solicitud {
  color: #d18cff;
  font-weight: 700;
  font-size: 1.05rem;
}

.mesa-card.mesa-con-solicitud .txt-solicitud {
  color: #d18cff;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-transform: uppercase;
  text-align: center;
  margin-top: 4px;
}

@keyframes pulse-purple {
  0%, 100% { box-shadow: 0 0 12px rgba(184, 92, 255, 0.4), inset 0 0 8px rgba(184, 92, 255, 0.15); }
  50%      { box-shadow: 0 0 20px rgba(184, 92, 255, 0.7), inset 0 0 12px rgba(184, 92, 255, 0.25); }
}
```

---

## CAMBIO 5 — Mejorar diseño de la pantalla de tomar pedido (CuentaScreen)

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\screens\CuentaScreen.jsx` + `CuentaScreen.css`

### Objetivos visuales

- **Botones touch-friendly:** mínimo 56px de altura para botones primarios.
- **Tipografía más legible:** font-size base 1rem (16px), títulos 1.4rem.
- **Mejor jerarquía:** acciones principales en dorado vibrante #f0c842, secundarias en gris #555.
- **Espaciado:** `padding` interno 16px en cards, `gap` 12px entre elementos del grid.
- **Cards de productos** con `border-radius: 12px` y sombra sutil al hover.
- **Footer fijo** con CUENTA y ORDEN siempre visibles, no scroll-locked.

### Cambios concretos en CuentaScreen.css

```css
/* Botones de categorías - mas grandes y mejor legibles */
.cs-categoria-btn {
  min-height: 48px;
  padding: 12px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Tarjetas de producto */
.cs-producto-card {
  min-height: 92px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #2a2a2a;
  background: linear-gradient(180deg, #161616 0%, #0a0a0a 100%);
  transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
}
.cs-producto-card:hover {
  border-color: #f0c842;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(240, 200, 66, 0.18);
}
.cs-producto-nombre {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}
.cs-producto-precio {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f0c842;
  margin-top: 6px;
}

/* Footer total */
.cs-footer {
  background: #0a0a0a;
  border-top: 2px solid #f0c842;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cs-footer-totales {
  display: flex;
  gap: 24px;
}
.cs-footer-label {
  font-size: 0.7rem;
  color: #888;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.cs-footer-valor {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f0c842;
}

/* Botones principales: ACEPTAR (verde), CANCELA (rojo), AGREGAR (dorado) */
.cs-btn-aceptar {
  background: linear-gradient(180deg, #1f8f3a 0%, #166b2c 100%);
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  min-height: 56px;
  padding: 14px 22px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.1s;
}
.cs-btn-aceptar:hover { transform: translateY(-1px); }
.cs-btn-aceptar:active { transform: translateY(0); }

.cs-btn-cancela {
  background: linear-gradient(180deg, #c93434 0%, #8a1f1f 100%);
  color: #fff;
  /* mismo padding, min-height, etc */
}

.cs-btn-agregar {
  background: linear-gradient(180deg, #f0c842 0%, #c9a432 100%);
  color: #0a0a0a;
  font-weight: 800;
}

/* Lista de productos en la cuenta */
.cs-lista-item {
  padding: 12px 14px;
  border-bottom: 1px solid #1a1a1a;
  display: grid;
  grid-template-columns: 50px 1fr auto auto;
  gap: 12px;
  align-items: center;
}
.cs-lista-item:hover {
  background: #161616;
}
.cs-lista-cantidad {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f0c842;
  text-align: center;
}
.cs-lista-descripcion {
  color: #fff;
  font-size: 0.95rem;
}
.cs-lista-precio,
.cs-lista-importe {
  text-align: right;
  color: #ddd;
  font-size: 0.95rem;
  min-width: 80px;
}
.cs-lista-importe {
  font-weight: 700;
  color: #f0c842;
}
```

### En CuentaScreen.jsx

NO cambiar lógica. Solo asegurar que las clases CSS arriba se apliquen correctamente. Si los `className` actuales no coinciden, ajustarlos para que reflejen los nombres de las nuevas reglas. Si se decide mantener nombres existentes, replicar los estilos sobre esos selectores.

---

## CAMBIO 6 — Mejorar diseño del modal "Cancelar Productos"

**Archivo:** `F:\BarAvenida\BarAvenida.Tablet\src\components\CancelarProductoModal.jsx` + CSS

### Objetivos

- Cambiar la tabla apretada por **cards seleccionables** (más fáciles de tappear).
- Cada card muestra: cantidad, descripción, precio unitario, importe — bien separados.
- Checkbox grande (24x24) en la esquina, fácil de marcar con dedo.
- Card con `border` que cambie a dorado cuando está seleccionada.
- Botón "SOLICITAR CANCELACIÓN" más prominente, mínimo 56px de alto.
- Dropdown de motivo con padding 14px y font-size 1rem.

### Patron sugerido

```jsx
<div className="cpm-lista">
  {productos.map(p => (
    <label
      key={p.id}
      className={`cpm-card ${seleccionados.includes(p.id) ? 'cpm-card-sel' : ''}`}
    >
      <input
        type="checkbox"
        className="cpm-checkbox"
        checked={seleccionados.includes(p.id)}
        onChange={() => toggle(p.id)}
      />
      <div className="cpm-card-cantidad">{p.cantidad}</div>
      <div className="cpm-card-info">
        <div className="cpm-card-nombre">{p.descripcion}</div>
        <div className="cpm-card-precio">${p.precio.toFixed(2)} c/u</div>
      </div>
      <div className="cpm-card-importe">${p.importe.toFixed(2)}</div>
    </label>
  ))}
</div>
```

```css
.cpm-card {
  display: grid;
  grid-template-columns: 32px 60px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 14px 18px;
  background: #131313;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.cpm-card:hover {
  border-color: #f0c842;
  background: #181818;
}
.cpm-card-sel {
  border-color: #f0c842;
  background: rgba(240, 200, 66, 0.08);
}
.cpm-checkbox {
  width: 24px;
  height: 24px;
  cursor: pointer;
}
.cpm-card-cantidad {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f0c842;
  text-align: center;
}
.cpm-card-nombre {
  font-size: 1.05rem;
  color: #fff;
  font-weight: 600;
}
.cpm-card-precio {
  font-size: 0.85rem;
  color: #888;
  margin-top: 4px;
}
.cpm-card-importe {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f0c842;
}

.cpm-btn-solicitar {
  min-height: 56px;
  padding: 16px 28px;
  background: linear-gradient(180deg, #f0c842 0%, #c9a432 100%);
  color: #0a0a0a;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.04em;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}
```

---

## CAMBIO 7 — Pulido general

### Animaciones sutiles

Agregar al CSS global de la Tablet (`src/index.css` o equivalente):

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in-up {
  animation: fadeInUp 0.25s ease-out;
}
```

### Tipografía

Asegurar que todo el cuerpo use:

```css
font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
```

Si no está cargada Inter, usar el fallback que ya viene.

### Espaciado consistente

- Margin entre secciones: 16px
- Padding interno cards: 14-16px
- Gap en grids: 12px

---

## Validación al terminar

1. **Build:** desde `F:\BarAvenida\BarAvenida.Tablet`:
   ```
   npm run build
   ```
   Resultado esperado: 0 errors, 0 warnings.

2. **Deploy a wwwroot:**
   ```powershell
   $ww = "F:\BarAvenida\BarAvenida.API\wwwroot\tablet"
   if (Test-Path $ww) { Remove-Item -Recurse -Force $ww }
   New-Item -ItemType Directory -Path $ww -Force | Out-Null
   Copy-Item -Recurse -Force "F:\BarAvenida\BarAvenida.Tablet\dist\*" $ww
   ```

3. **Reiniciar servicio backend** para que sirva el bundle nuevo:
   ```
   Restart-Service -Name BarAvenidaAPI
   ```

4. **Validación visual desde el celular:**
   - URL: `http://192.168.100.10:7000/tablet/`
   - Login con cualquier mesera
   - Tappear una mesa libre → aparece modal con dropdowns ÁREA y MESA editables
   - Cambiar a Terraza → debe filtrar mesas de Terraza
   - Cerrar modal sin guardar
   - Verificar que YA NO aparece "BARRA RÁPIDA" en el top bar
   - Verificar que el sidebar NO muestra "BARRA" en filtros
   - Solicitar cancelación de una mesa → la tarjeta de la mesa debe ponerse MORADA con texto "PENDIENTE DE CANCELACIÓN"

---

## Lo que NO toca este spec (queda para otros)

- **Servicio Rápido en Admin:** mover funcionalidad de barra al Admin (otro spec).
- **Login:** Coronado dijo que ya le gusta como está.
- **Pantalla "Ver Precios":** Coronado dijo que está bien.
- **Backend:** este spec es 100% frontend Tablet. Los endpoints existentes alcanzan.

---

## Notas para Claude Code

- **Conserva** `BarraRapidaScreen.jsx` y su CSS, solo quita imports y referencias.
- **Conserva** las clases CSS sin uso (`am-campo-readonly`, `am-ico-lock`).
- **NO toques** `LoginScreen.jsx`, `VerPreciosScreen.jsx`, ni `CobrarCuentaModal.jsx`.
- Si encuentras inconsistencia entre lo descrito aquí y el código real, **prioriza el spec** y reporta la discrepancia al final del trabajo.
- Si dudas con un color o tamaño exacto, **usa el valor del spec** sin inventar.
- Build final 0 errors, 0 warnings — si hay warnings nuevos, repórtalos.
