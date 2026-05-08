# SPEC F — KDS Auto-pilot

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork con análisis del KDS actual
> **SIN backend, SIN migración EF, sin librerías nuevas**
> **Sesión estimada:** 2-2.5h Claude Code
> **Cierra Fase 2 al 100%**

---

## 1. Objetivo

El KDS actual muestra cada orden como una tarjeta independiente. El barman ve
un mar de tarjetas sin agrupar — si la Mesa 5 envió Corona, después Tequila,
después Cacahuates, el barman ve 3 tarjetas separadas. Con Auto-pilot:

1. **Agrupación por mesa** — una sola tarjeta por mesa con todas sus órdenes pendientes apiladas dentro.
2. **Priorización automática** — las mesas con más tiempo de espera aparecen primero (urgentes arriba).
3. **Banner de métricas vivas** — header muestra: total mesas, tiempo promedio, mesas urgentes.
4. **Marca "🔥 URGENTE"** — mesas con tiempo de espera > umbral aparecen con borde rojo grueso y badge urgente.

**Importante:** mantener compatibilidad con el flujo actual. El botón "✓ LISTO"
debe seguir marcando UNA orden a la vez (no toda la mesa). Cuando todas las
órdenes de una mesa están listas, la tarjeta desaparece.

## 2. Decisión arquitectónica

**Solo frontend del KDS.** No tocar backend. La agrupación se hace en cliente
(JS reduce/groupBy sobre `ordenes`). Esto evita cambios en el contrato del API
y hace el bloque manageable en una sesión.

**Conservar `OrdenCard.jsx` y `OrdenCard.css`** (regla de oro). Crear nuevo
componente `MesaCard.jsx` que reemplaza el uso pero el viejo archivo se queda.

## 3. Frontend KDS — cambios

### 3.1 `App.jsx`

Cambios principales:

1. **Agrupar `ordenes` por mesa** antes de renderizar:
```javascript
const grupos = useMemo(() => {
  const map = new Map()
  for (const orden of ordenes) {
    const mesaId = orden.mesaId ?? orden.mesa?.id ?? orden.mesaNumero
    if (!map.has(mesaId)) {
      map.set(mesaId, {
        mesaId,
        mesaNumero: orden.mesaNumero ?? orden.mesa?.numero ?? mesaId,
        mesera: orden.nombreMesera ?? orden.mesera?.nombre ?? orden.usuarioNombre ?? 'Mesera',
        ordenes: [],
        // Tiempo de espera de la orden MÁS VIEJA del grupo
        primeraFecha: orden.fechaEnvio,
      })
    }
    const g = map.get(mesaId)
    g.ordenes.push(orden)
    if (new Date(orden.fechaEnvio) < new Date(g.primeraFecha)) {
      g.primeraFecha = orden.fechaEnvio
    }
  }
  // Convertir a array y ordenar: mesas con más tiempo (más viejas) primero
  return Array.from(map.values())
    .sort((a, b) => new Date(a.primeraFecha) - new Date(b.primeraFecha))
}, [ordenes])
```

2. **Calcular métricas vivas** del header:
```javascript
const metricas = useMemo(() => {
  if (grupos.length === 0) return null
  const ahora = now.getTime()
  const minutos = grupos.map(g => (ahora - new Date(g.primeraFecha).getTime()) / 60000)
  const promedio = minutos.reduce((s, m) => s + m, 0) / minutos.length
  const urgentes = minutos.filter(m => m >= 5).length
  return {
    totalMesas: grupos.length,
    promedio:   Math.round(promedio),
    urgentes,
  }
}, [grupos, now])
```

3. **Render del banner de métricas** (entre header y grid):
```jsx
{metricas && (
  <div className="metricas-bar">
    <div className="met-item">
      <span className="met-num">{metricas.totalMesas}</span>
      <span className="met-lbl">mesa{metricas.totalMesas !== 1 ? 's' : ''}</span>
    </div>
    <div className="met-sep" />
    <div className="met-item">
      <span className="met-num">{metricas.promedio}</span>
      <span className="met-lbl">min promedio</span>
    </div>
    <div className="met-sep" />
    <div className={`met-item ${metricas.urgentes > 0 ? 'met-urgente' : ''}`}>
      <span className="met-num">{metricas.urgentes}</span>
      <span className="met-lbl">urgente{metricas.urgentes !== 1 ? 's' : ''}</span>
    </div>
  </div>
)}
```

4. **Reemplazar el grid** de `OrdenCard` por `MesaCard`:
```jsx
<div className="mesas-grid">
  {grupos.map(grupo => (
    <MesaCard
      key={grupo.mesaId}
      grupo={grupo}
      now={now}
      onListo={handleListo}
    />
  ))}
</div>
```

5. **Mantener** los listeners de SignalR (`NuevaOrden`, `OrdenLista`), el reloj, y `handleListo` sin cambios. La agrupación es solo cosmética en el render.

### 3.2 `MesaCard.jsx` (nuevo)

`F:\BarAvenida\BarAvenida.KDS\src\components\MesaCard.jsx`:

```jsx
import { useState } from 'react'
import './MesaCard.css'

function getMinutes(fecha, now) {
  if (!fecha) return 0
  return (now - new Date(fecha)) / 60000
}

function colorClass(fecha, now) {
  const mins = getMinutes(fecha, now)
  if (mins >= 5) return 'mc-red'
  if (mins >= 2) return 'mc-yellow'
  return 'mc-green'
}

function formatElapsed(fecha, now) {
  const mins = Math.floor(getMinutes(fecha, now))
  if (mins < 1) return 'Recién'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

function formatHora(fecha) {
  if (!fecha) return '--:--'
  return new Date(fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MesaCard({ grupo, now, onListo }) {
  const [removingId, setRemovingId] = useState(null)
  const color   = colorClass(grupo.primeraFecha, now)
  const elapsed = formatElapsed(grupo.primeraFecha, now)
  const urgente = getMinutes(grupo.primeraFecha, now) >= 5

  const handleListo = (ordenId) => {
    if (removingId) return
    setRemovingId(ordenId)
    setTimeout(() => onListo(ordenId), 360)
  }

  // Aplanar todos los detalles de las órdenes del grupo, manteniendo referencia
  // a la orden de origen para que el botón LISTO opere a nivel de orden.
  return (
    <article className={`mesa-card ${color} ${urgente ? 'mc-urgente' : ''}`}>

      <header className="mc-top">
        <span className="mc-mesa">MESA {grupo.mesaNumero}</span>
        {urgente && <span className="mc-badge-urgente">🔥 URGENTE</span>}
      </header>

      <div className="mc-mesera">{String(grupo.mesera).toUpperCase()}</div>

      <hr className="mc-sep" />

      {/* Cada orden es una sección dentro de la card */}
      <div className="mc-ordenes">
        {grupo.ordenes.map((orden, idx) => {
          const detalles = orden.detalles ?? orden.ordenDetalles ?? []
          const isRemoving = removingId === orden.id
          return (
            <div
              key={orden.id}
              className={`mc-orden ${isRemoving ? 'removing' : ''}`}
            >
              <div className="mc-orden-header">
                <span className="mc-orden-num">
                  {orden.esAgregado ? '≡ AGREGADO' : `Comanda #${idx + 1}`}
                </span>
                <span className="mc-orden-hora">{formatHora(orden.fechaEnvio)}</span>
              </div>
              <ul className="mc-detalles">
                {detalles.map((d, i) => (
                  <li key={i} className="mc-det">
                    <span className="mc-cant">{d.cantidad}×</span>
                    <span className="mc-prod">
                      {d.nombreProducto ?? d.producto?.nombre ?? d.productoNombre ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className="mc-btn-listo"
                onClick={() => handleListo(orden.id)}
                disabled={isRemoving}
              >
                ✓ LISTO
              </button>
            </div>
          )
        })}
      </div>

      <hr className="mc-sep" />

      <footer className="mc-footer">
        <span className="mc-tiempo">{elapsed} esperando</span>
        <span className="mc-count">
          {grupo.ordenes.length} comanda{grupo.ordenes.length !== 1 ? 's' : ''}
        </span>
      </footer>

    </article>
  )
}
```

### 3.3 `MesaCard.css` (nuevo)

`F:\BarAvenida\BarAvenida.KDS\src\components\MesaCard.css`:

Reusa los colores del KDS actual (`OrdenCard.css` como referencia):
- Verde: borde `#16a34a`, glow leve
- Amarillo: borde `#fbbf24`
- Rojo: borde `#dc2626` con animación pulse

Estructura:
```css
.mesa-card {
  background: #1a1a1a;
  border: 3px solid;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: mcCardIn 0.22s ease-out;
}

@keyframes mcCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.mesa-card.mc-green   { border-color: #16a34a; box-shadow: 0 0 0 1px rgba(22,163,74,0.15); }
.mesa-card.mc-yellow  { border-color: #fbbf24; box-shadow: 0 0 0 1px rgba(251,191,36,0.20); }
.mesa-card.mc-red     { border-color: #dc2626; }

.mesa-card.mc-urgente {
  animation: mcUrgentePulse 1.2s ease-in-out infinite, mcCardIn 0.22s ease-out;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.5);
}

@keyframes mcUrgentePulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.4); }
  50%      { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}

.mc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mc-mesa {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #fff;
}

.mc-badge-urgente {
  background: #dc2626;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  animation: mcBadgeFlash 1s ease-in-out infinite;
}

@keyframes mcBadgeFlash {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.7; }
}

.mc-mesera {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ddd;
  letter-spacing: 0.06em;
}

.mc-sep {
  border: none;
  border-top: 1px solid #2e2e2e;
  margin: 0;
}

.mc-ordenes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mc-orden {
  background: #0f0f0f;
  border: 1px solid #2e2e2e;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: opacity 0.36s, transform 0.36s;
}
.mc-orden.removing {
  opacity: 0;
  transform: translateX(40px);
}

.mc-orden-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #a0820d;
}
.mc-orden-num  { text-transform: uppercase; }
.mc-orden-hora { color: #888; font-variant-numeric: tabular-nums; }

.mc-detalles {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mc-det {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 1.05rem;
  color: #f1f1f1;
}

.mc-cant {
  color: #fbbf24;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  min-width: 32px;
}

.mc-prod {
  color: #fff;
  font-weight: 600;
}

.mc-btn-listo {
  margin-top: 4px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.12s, transform 0.08s;
}
.mc-btn-listo:hover  { background: #22c55e; }
.mc-btn-listo:active { background: #15803d; transform: scale(0.97); }
.mc-btn-listo:disabled { opacity: 0.5; cursor: not-allowed; }

.mc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #999;
  font-weight: 700;
}
.mc-tiempo { color: #fbbf24; }
.mc-count  { color: #888; }
```

### 3.4 `App.css` — agregar banner métricas

Agregar al final:
```css
/* PROMPT F — Banner de métricas vivas */
.metricas-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  padding: 10px 20px;
  background: #0a0a0a;
  border-bottom: 1px solid #2e2e2e;
}

.met-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.met-num {
  font-size: 1.6rem;
  font-weight: 900;
  color: #fbbf24;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.met-lbl {
  font-size: 0.65rem;
  color: #888;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}

.met-item.met-urgente .met-num { color: #ef4444; }
.met-item.met-urgente { animation: metUrgentePulse 1.2s ease-in-out infinite; }

@keyframes metUrgentePulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.met-sep {
  width: 1px;
  height: 32px;
  background: #2e2e2e;
}

.mesas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
  padding: 16px;
}
```

(Si `App.css` ya tiene `.ordenes-grid`, conservarlo y AGREGAR `.mesas-grid` con esos mismos estilos. Conservar = regla de oro.)

## 4. Criterios de aceptación

- [ ] Una mesa con 1 sola orden se muestra como antes (mismo comportamiento visual).
- [ ] Una mesa con 2+ órdenes pendientes se agrupa en UNA sola tarjeta `MesaCard` con secciones internas por orden.
- [ ] Las cards se ordenan: la mesa con la orden más vieja aparece primero (arriba/izquierda).
- [ ] Banner de métricas muestra: total mesas, promedio min, urgentes.
- [ ] Mesa con tiempo ≥ 5 min muestra borde rojo + badge "🔥 URGENTE" + animación pulse.
- [ ] Botón "✓ LISTO" sigue marcando UNA orden a la vez (no la mesa entera).
- [ ] Cuando se quita la última orden de una mesa, la tarjeta entera desaparece.
- [ ] Cuando llega `NuevaOrden` para una mesa que ya tiene tarjeta, se agrega a la misma tarjeta (no crea nueva).
- [ ] El sonido beep sigue funcionando al llegar nueva orden.
- [ ] **Build KDS en 0/0**.

## 5. Pruebas manuales

1. **Setup:** levantar backend, KDS, Tablet.
2. **Tablet:** Mesa 1 → Corona → ACEPTAR (orden 1).
3. **Tablet:** Mesa 2 → Tequila → ACEPTAR (orden 2).
4. **Tablet:** Mesa 1 → Cacahuates → ACEPTAR (orden 3, agregado).
5. **KDS verifica:**
   - Aparece **1 tarjeta para Mesa 1** con DOS secciones internas (Comanda 1: Corona, Comanda 2 marcado AGREGADO: Cacahuates).
   - Aparece **1 tarjeta para Mesa 2** con UNA sección (Tequila).
   - Banner: "2 mesas • X min promedio • 0 urgentes".
6. **Esperar 5 min** (o cambiar reloj del sistema):
   - Las cards pasan a borde rojo + badge URGENTE.
   - Banner: "2 mesas • Y min • 2 urgentes" (en rojo pulsante).
7. **Click "✓ LISTO" en Comanda 1 de Mesa 1**:
   - Comanda 1 se va con animación slide-out.
   - La tarjeta de Mesa 1 sigue visible con solo Comanda 2.
8. **Click "✓ LISTO" en Comanda 2 de Mesa 1**:
   - La tarjeta entera de Mesa 1 desaparece.

## 6. Reglas de oro

- **NO** instalar librerías nuevas.
- **NO** ejecutar `dotnet run` ni `npm run dev`.
- **NO** tocar el backend.
- **CONSERVAR** `OrdenCard.jsx` y `OrdenCard.css` (no eliminar — regla de oro).
- Build final en **0 errors, 0 warnings**.
- Cuando termines, reportar:
  - Lista de archivos modificados/creados
  - Resultado del build KDS
  - Cualquier decisión de diseño tomada

## 7. Archivos esperados (resumen)

| Archivo | Acción | Aprox |
|---|---|---|
| `BarAvenida.KDS/src/App.jsx` | Modificar (agrupación + métricas + reemplazo OrdenCard→MesaCard) | +60 |
| `BarAvenida.KDS/src/App.css` | Modificar (estilos métricas + .mesas-grid) | +60 |
| `BarAvenida.KDS/src/components/MesaCard.jsx` | NUEVO | ~110 |
| `BarAvenida.KDS/src/components/MesaCard.css` | NUEVO | ~180 |
| `BarAvenida.KDS/src/components/OrdenCard.{jsx,css}` | **CONSERVAR sin cambios** | 0 |

**Total: ~410 líneas, 2 archivos nuevos, 2 archivos modificados.**
**Cero backend, cero migraciones, cero librerías.**
