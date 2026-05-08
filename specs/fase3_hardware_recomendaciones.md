# FASE 3 — Hardware del Bar Avenida (recomendaciones de compra)

Investigación y recomendaciones concretas para Coronado. Precios MX a Mayo 2026 (orientativos, verificar al comprar).

---

## 1. PC Servidor central

**Lo que necesitas:** PC potente que tengas guardada (ya mencionaste que tienes una). Requisitos mínimos:

- Windows 10 / 11 x64
- 8 GB RAM mínimo (16 GB recomendado)
- 256 GB SSD
- SQL Server (Express o superior, gratis)
- Conexión Ethernet al router del bar (más estable que WiFi)
- UPS (No-Break) de respaldo — **importante** para cierres limpios si se va la luz

**Recomendación de UPS:** APC Back-UPS BX1100M-LM (1100VA / 600W) — ~$2,500 MXN. Suficiente para 15-20 minutos con la PC servidor.

---

## 2. Tablets para meseras

**Decisión recomendada:** Lenovo Tab M11 (2024) — la mejor relación calidad/precio para hostelería.

| Modelo | Precio aprox MX | Pros | Contras |
|---|---|---|---|
| **Lenovo Tab M11 11"** ⭐ | ~$4,500 - $5,500 | Pantalla 90Hz, batería 7040 mAh (10h+), Android 13, robusta, 11 pulgadas perfecto | Sin LTE en versión WiFi |
| Samsung Galaxy Tab A9+ 11" | ~$5,000 - $6,500 | Pantalla 90Hz, audio Dolby, soporte Samsung | Más caro, batería menor |
| Xiaomi Pad SE 11" | ~$4,000 | Económica, Android 14 | Batería 6650 mAh, menos robusta |
| Honor Pad X8a 11" | ~$3,800 | Más barata | Procesador débil, lag con tu app |
| iPad 9na gen 10.2" | ~$7,500 | iOS confiable, soporta tu PWA perfecto | Más caro, ecosistema cerrado |

**Mi recomendación:** **3 unidades de Lenovo Tab M11** (1 por mesera + 1 de respaldo). Total ~$15,000 MXN.

**Razones:**
1. Pantalla de 11 pulgadas es el sweet spot (no muy chica, no muy grande para llevar)
2. Batería de 10+ horas cubre un turno completo
3. Android estándar, instala tu PWA sin problemas desde Chrome
4. Robusta, soporta caídas mejor que las baratas
5. Precio razonable (3 cuestan menos que un iPad)

**Accesorios indispensables (por cada tablet):**
- **Funda con stand** tipo "rugged" (Otterbox o similar) — $400-600/c-u
- **Mica de cristal templado** — $150/c-u
- **Cargador USB-C de 30W** — $300/c-u
- **Cable USB-C trenzado** — $200/c-u

**Total por tablet equipada:** ~$5,500 + $1,200 accesorios = $6,700 MXN
**Total 3 tablets equipadas:** ~$20,000 MXN

---

## 3. PC para KDS (barra)

**Recomendación:** Mini PC con monitor grande montado en pared.

**Mini PC:**
- Beelink S12 Pro (Intel N100, 16GB RAM, 500GB SSD) — ~$5,500 MXN
- O reciclar una laptop vieja que tengas

**Monitor:**
- LG 27" Full HD IPS (27UN500-W o similar) — ~$5,000 MXN
- Soporte VESA de pared — $500 MXN

**Total KDS:** ~$11,000 MXN

---

## 4. Impresora térmica + cajón

**Lo que ya tienes:** GHIA GTP801 USB ESC/POS 80mm + cajón RJ-11.

**Si necesitas backup:**
- Epson TM-T20III USB (Latin) — ~$3,500 MXN, súper confiable
- Cajón de dinero RJ-11 universal — ~$1,500 MXN

---

## 5. Red WiFi del bar

**Lo más importante:** WiFi estable y rápido para que las tablets no se desconecten.

**Recomendación:**
- **Router empresarial:** TP-Link Archer AX73 (WiFi 6) — ~$2,000 MXN
- **Repetidor / Mesh:** TP-Link Deco X20 (pack 2 nodos) — ~$2,500 MXN si el bar es grande

**Configuración:**
- SSID dedicado para el sistema POS (red separada de clientes)
- Banda 5GHz (más rápida) o 2.4GHz (más alcance)
- Reservar IP fija al servidor (192.168.100.10)
- Reservar IPs estáticas a las tablets para identificarlas en logs

---

## 6. Sensores de inventario IoT (FASE 2)

**Concepto:** Botellas con balanza inteligente para detectar nivel de líquido en tiempo real.

**Hardware recomendado:**

### Opción A: ESP32 + Celda de carga HX711 (DIY, más económico)

| Componente | Precio | Cantidad | Total |
|---|---|---|---|
| ESP32 DevKit v1 (WiFi/BT) | $200 | 10 | $2,000 |
| Celda de carga 5kg + HX711 | $180 | 10 | $1,800 |
| Caja plástica + cables | $100 | 10 | $1,000 |
| Fuente 5V USB | $80 | 10 | $800 |
| **Subtotal hardware base** | | | **$5,600** |

Cubre 10 botellas premium (los tequilas/whiskys más caros). Cada balanza pesa la botella en tiempo real. ESP32 manda lectura por MQTT al backend cada 10 segundos.

### Opción B: Sensores comerciales (más caro pero plug-and-play)

- **Smart Pour BarVision** (~$8,000 USD el set completo) — sistema profesional usado en bares de gama alta
- **Beverage Tracker Pro** (~$3,000 USD)

Para Bar Avenida, Opción A es mejor: más barata, hackeable, escalable.

### Tags NFC alternativa (más simple para CONTAR botellas)

- Tag NFC NTAG215 (paquete 50) — ~$500 MXN
- Lector NFC USB para PC servidor — ~$400 MXN
- Cuando barman saca una botella, pasa el tag por el lector → descuenta del inventario

Esto es **mucho más simple que las balanzas** y suficiente para conteo. Las balanzas serían si quieres ver cuántos shots quedan en cada botella.

**Mi recomendación:** empezar con NFC tags (~$1,000 MXN total) y ver si necesitas balanzas después.

---

## 7. Networking del Bar

**Diagrama recomendado:**

```
                  INTERNET (Telmex/Megacable)
                          |
                  Router empresarial (Archer AX73)
                          |
              ┌───────────┼───────────┐
              │           │           │
         PC Servidor    Mesh WiFi     PC KDS
         (Ethernet)     (5GHz)       (Ethernet o WiFi)
                            │
                ┌───────────┼───────────┐
                │           │           │
            Tablet 1    Tablet 2    Tablet 3
            (Mesera 1)  (Mesera 2)  (Reserva)
```

**IPs sugeridas:**
- 192.168.100.1   → Router
- 192.168.100.10  → PC Servidor (fija)
- 192.168.100.11  → PC KDS (fija)
- 192.168.100.20-29 → Tablets meseras (DHCP reserva por MAC)
- 192.168.100.50-59 → Sensores ESP32 IoT

---

## 8. Resumen del presupuesto

| Concepto | Costo MX |
|---|---|
| 3 Tablets Lenovo Tab M11 + accesorios | $20,000 |
| PC Mini para KDS + monitor + soporte | $11,000 |
| UPS para servidor | $2,500 |
| Router + Mesh WiFi | $4,500 |
| Cableado / instalación | $1,500 |
| Sensores IoT NFC (inicial) | $1,000 |
| Margen / imprevistos | $5,000 |
| **TOTAL ESTIMADO** | **$45,500 MX** |

Con $50,000 MXN tienes el sistema completo y bien equipado.

---

## 9. Dónde comprar

**Tablets / Mini PC / Monitores:** Mercado Libre MX (vendedores oficiales con +95% rep), Amazon MX, Office Depot, Best Buy MX
**Sensores IoT:** Mercado Libre, Steren, Mouser MX, AliExpress (más barato pero tarda 30 días)
**Impresora térmica de respaldo:** Epson Mexico, Office Depot
**Router empresarial:** Cyberpuerta, Mercado Libre

---

## 10. Plan de instalación

**Día 1 — Antes de ir al bar:**
1. Comprar todo lo de la lista
2. Configurar router y mesh en tu casa
3. Instalar todas las tablets con la PWA (`http://192.168.100.10:7000/tablet/`)
4. Probar conectividad y captura

**Día 2 — Mudanza al bar:**
1. Apagar todo del sistema viejo (Soft Restaurant)
2. Instalar router en el bar (puerto Ethernet del módem Telmex/Megacable)
3. Conectar PC servidor por cable Ethernet
4. Instalar Bar Avenida Server Setup 1.0.0.exe
5. Restaurar BD (importar productos, mesas, usuarios)
6. Conectar PC KDS y probar
7. Conectar tablets al WiFi del bar
8. Test maratón de 4-6 horas con flujos reales

**Día 3 — Operación supervisada:**
1. Primer turno con meseras reales
2. Tú al admin viendo todo
3. Anotar fricciones para fix posterior

**Día 4-7 — Ajustes finos:**
1. Cada noche al cierre, revisar logs
2. Ajustar UI según feedback
3. Una vez estable → gracias y a operar normal

---

## Nota importante

Este es un plan de **inversión en hardware** que no toca código. Coronado puede ejecutarlo cuando esté listo financieramente. El sistema POS ya está completo y funcionando con el hardware actual.
