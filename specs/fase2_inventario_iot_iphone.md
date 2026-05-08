# FASE 2 — Inventario IoT en tiempo real + App iPhone

Diseño técnico completo del sistema de inventario con sensores físicos. Coronado quiere ver el inventario del bar en tiempo real desde su iPhone 17 Pro Max y desde el Admin web.

---

## Visión

```
[Botellas en bar] ───sensores───▶ [Backend MQTT] ───SignalR───▶ [Admin Web]
                                                          ───▶ [App iPhone]
```

Cuando alguien:
- **Saca una botella** → sensor detecta cambio de peso/posición → backend recibe → push a iPhone y Admin
- **Devuelve una botella** → sensor detecta → push
- **Sirve un shot** → balanza detecta peso menor → push

El operador ve todo en vivo desde su celular.

---

## Arquitectura técnica

### Capa 1: Sensores físicos (ya cubierto en FASE 3)

**Opción A — NFC tags (recomendada para empezar):**
- Cada botella tiene un tag NFC NTAG215 pegado abajo
- Lector NFC USB conectado a la PC servidor
- Cuando barman saca/devuelve botella, pasa por el lector
- El lector envía evento al backend

**Opción B — Balanzas inteligentes (siguiente fase):**
- ESP32 + celda de carga HX711 debajo de cada botella premium
- Cada 10 segundos manda peso por MQTT
- Backend calcula nivel de líquido (peso vacío vs lleno → % restante)

### Capa 2: Backend

**Tablas nuevas en BD:**

```sql
CREATE TABLE Sensores (
    Id INT PRIMARY KEY IDENTITY,
    Nombre NVARCHAR(100) NOT NULL,           -- "Tequila Don Julio Reposado"
    Tipo NVARCHAR(20) NOT NULL,              -- 'NFC' / 'Balanza'
    IdentificadorFisico NVARCHAR(100),       -- UID del NFC o MAC del ESP32
    ProductoId INT,                          -- FK a Productos
    PesoVacio DECIMAL(10,2),                 -- gramos (solo balanzas)
    PesoLleno DECIMAL(10,2),                 -- gramos (solo balanzas)
    UbicacionDescripcion NVARCHAR(200),      -- "Estante 3, posición 2"
    Activo BIT DEFAULT 1,
    CreadoEn DATETIME DEFAULT GETDATE()
);

CREATE TABLE LecturasSensor (
    Id BIGINT PRIMARY KEY IDENTITY,
    SensorId INT NOT NULL,
    Tipo NVARCHAR(20) NOT NULL,              -- 'Sacar' / 'Devolver' / 'PesoActual'
    ValorNumerico DECIMAL(10,2),             -- gramos o NULL para NFC
    NivelEstimadoPorc INT,                   -- 0-100 (solo balanzas)
    UsuarioBarmanId INT,                     -- quién sacó (si está logueado)
    Timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (SensorId) REFERENCES Sensores(Id)
);
```

**Endpoints nuevos:**

```
POST /api/inventario/lectura
   Body: { sensorId, tipo, valor }
   Llamado por sensores ESP32 o lector NFC

GET /api/inventario/estado
   Devuelve [{ sensor, ultimaLectura, nivel, alerta }]

GET /api/inventario/movimientos?fecha=YYYY-MM-DD
   Histórico

POST /api/inventario/sensor
GET  /api/inventario/sensores
DELETE /api/inventario/sensor/{id}
```

**SignalR hub (extender BarHub):**

```csharp
// Cuando llega lectura, broadcast a grupo "Inventario"
await hubContext.Clients.Group("Inventario").SendAsync("LecturaInventario", new {
    sensorId, productoNombre, tipo, nivel, timestamp
});
```

### Capa 3: Admin Web — pantalla de Inventario en vivo

Nueva pantalla `BarAvenida.Admin/src/screens/InventarioVivoScreen.jsx`:

- Grid de cards, una por sensor
- Cada card muestra:
  - Nombre del producto (ej: "Tequila Don Julio Reposado")
  - Imagen del producto
  - Nivel actual (barra horizontal con color: verde >50%, amarillo 20-50%, rojo <20%)
  - Última lectura (hace X minutos)
  - Alerta si nivel <10%
- Filtros: por categoría (Tequilas, Whiskys, etc.), por nivel
- Push automático via SignalR cuando hay lecturas nuevas — la card se ilumina suavemente cuando hay cambio

### Capa 4: App iPhone (Capacitor + iOS)

**Stack:**
- **Capacitor** para envolver una webapp React en una app iOS nativa
- **React + Vite** ya conocido en el proyecto
- **Notificaciones push** via APNs (Apple Push Notification Service)

**Pantallas:**

1. **Dashboard inventario:** mismo grid que Admin Web pero optimizado para iPhone (cards más grandes, scroll vertical)
2. **Detalle de botella:** historial de movimientos de la botella seleccionada
3. **Alertas:** lista de productos con nivel bajo
4. **Configuración:** URL del backend (auto-detect en LAN igual que Admin)

**Notificaciones push:**
- Cuando un producto baja de 20%: "⚠ Tequila Don Julio Reposado está al 18%"
- Cuando se acaba: "❌ Whisky Buchanan's 18 vacío"
- Cuando hay actividad anómala (ej: 3 botellas sacadas en 2 minutos): "🤔 Actividad inusual en barra"

**Distribución:**
- Para iPhone personal de Coronado, no necesitas App Store
- Build con **TestFlight** (cuenta Apple Developer, $99 USD/año) — más fácil
- O instalar via **Xcode** + iPhone conectado por cable (gratis pero requiere refresh cada 7 días)

---

## Stack de implementación

**Capacitor para iOS — pasos:**

```bash
# Crear app iOS desde el código React existente
cd F:\BarAvenida
mkdir BarAvenida.Mobile
cd BarAvenida.Mobile

npm init -y
npm install --save react react-dom vite @capacitor/core @capacitor/ios
npm install --save-dev @vitejs/plugin-react @capacitor/cli

npx cap init "BarAvenida" "com.baravenida.mobile" --web-dir=dist
npx cap add ios

# Trabajar en el código React igual que el Admin
# Build: npx vite build && npx cap sync ios
# Abrir en Xcode: npx cap open ios
```

**Requisitos para compilar iOS:**
- Mac con Xcode (NO se puede compilar iOS en Windows)
- Apple Developer Account ($99 USD/año) si quieres usar TestFlight
- iPhone para pruebas

**Si Coronado no tiene Mac:**
- Servicio cloud de build: **Codemagic** o **EAS Build** (gratis tier)
- Yo puedo guiar el setup remoto cuando llegue ese momento

---

## Plan de implementación por etapas

**Etapa A — Backend del inventario (1 sesión, ~3 horas)**
1. Migración EF: tablas Sensores, LecturasSensor
2. Controller InventarioController con endpoints CRUD
3. Hub SignalR extendido
4. Tests con curl

**Etapa B — Admin Web (1 sesión, ~3 horas)**
1. Nueva pantalla InventarioVivoScreen.jsx
2. Cards con barras animadas
3. SignalR client para pushes en tiempo real
4. Validación E2E con Chrome MCP

**Etapa C — Sensores NFC (1 sesión + hardware)**
1. Comprar lector NFC USB + tags (FASE 3)
2. Servicio Windows pequeño que lee NFC y envía POST al backend
3. Configurar 5-10 botellas como prueba

**Etapa D — App iPhone (2 sesiones)**
1. Setup Capacitor + Vite con React
2. Replicar pantalla de inventario optimizada para móvil
3. Notificaciones push (requiere Apple Developer Account)
4. Build con Xcode o Codemagic

**Etapa E — Sensores con balanzas (futuro, opcional)**
1. Comprar ESP32 + HX711
2. Firmware Arduino que manda MQTT
3. Backend lee MQTT y guarda lectura

---

## Costos adicionales

| Concepto | Costo |
|---|---|
| Apple Developer Account | $99 USD/año (~$1,800 MXN) |
| Codemagic CI/CD para iOS | Gratis (200 min/mes) |
| Hardware NFC inicial | $1,000 MXN (FASE 3) |
| Hardware ESP32 balanzas (opcional) | $5,600 MXN (FASE 3) |

---

## Notas técnicas

- **Privacidad:** los datos NUNCA salen del bar. Todo es local en tu red.
- **Offline:** si se cae el WiFi, los sensores guardan en buffer local y mandan cuando vuelve.
- **Seguridad:** cada sensor tiene token único para autenticarse al backend.
- **Escalabilidad:** el sistema soporta cientos de sensores sin problema.

---

## Cuándo arrancar esta fase

**No antes de:**
1. ✅ POS actual estable y operando 1-2 semanas en el bar
2. ✅ Hardware comprado (FASE 3)
3. ✅ Decisión de Apple Developer Account o build alternativo

**Esperar al menos 30 días de operación POS estable** antes de meter complejidad de inventario IoT. Lo último que quieres es debuggear sensores mientras intentas operar el bar.
