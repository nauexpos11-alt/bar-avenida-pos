# 🗺️ Roadmap General del Proyecto Bar Avenida

Visión completa por fases, con specs detallados para cada una.

---

## ✅ COMPLETADO (Mayo 7-8, 2026)

### Fase 0 — POS Base
- B1, B1.1, B2, B3 (cancelaciones, PIN modal, descripciones)
- A (UI tablet pulida)

### Fase 1 — Caja Inteligente y Reportes
- PROMPT C.1, C.2, C.3 (sugerencia fondo, alertas, cierre asistido)
- PROMPT D (dashboard vivo)
- PROMPT E (reportes interpretativos)

### Fase 2 — KDS y Anti-fuga
- PROMPT F (KDS auto-pilot)
- PROMPT G (smart suggestions)
- PROMPT H (anti-fuga)

### Fase 3 — IA
- PROMPT IA.1 (análisis IA del informe con Claude API)

### OLA 1 — Producción ready
- Backend como Servicio Windows
- Backups automáticos cada hora
- Health check diario 8am
- Logs persistentes Serilog
- API key Claude en User Secrets
- Permisos SQL para SYSTEM

### OLA 2 — Distribución profesional
- Tablet PWA con offline queue
- Admin Electron .exe 1.1.0 con auto-detect IP
- KDS Electron .exe 1.1.0 con auto-detect IP
- Server Setup .exe con Inno Setup

### DevOps
- GitHub privado (github.com/nauexpos11-alt/bar-avenida-pos)
- GitHub Actions CI (4 jobs por push)
- Scripts: deploy-todo, deploy-{tablet,kds,admin}, git-push, health-check

### Audit y Round 1+2 fixes Admin (11 fixes validados)
- Mesas ordenadas, login QWERTY (después revertido en R3), validaciones
- Tooltips Próximamente, reloj servidor, iconos SVG

---

## 🔄 EN PROGRESO

### Round 3 — Mega-limpieza Admin
- Spec: `specs/fixes_admin_round_3_megalimpieza.md`
- 3 bugs reportados en .docx Coronado:
  - Categorías sin botón Eliminar
  - Reglas Cross-Sell sin acciones
  - REVERTIR botón QWERTY del login (solo numpad pero teclado físico acepta letras)
- Limpieza profunda: quitar opciones que no usa el bar
- Habilitar Servicio RÁPIDO para clientes en barra
- UI nivel comercial: Inter font, animaciones, hovers dorados
- Estado: en Claude Code

---

## 📋 PRÓXIMAS FASES

### FASE 3 — Hardware
**Spec:** `specs/fase3_hardware_recomendaciones.md`
- 3 Tablets Lenovo Tab M11 (~$20,000 MXN)
- Mini PC + Monitor para KDS (~$11,000)
- Router empresarial + Mesh WiFi (~$4,500)
- UPS para servidor (~$2,500)
- Sensores NFC iniciales (~$1,000)
- **Total presupuesto: ~$45,500 MXN**
- Plan de instalación: 4 días

### FASE 2 — Inventario IoT + App iPhone
**Spec:** `specs/fase2_inventario_iot_iphone.md`
- Sensores NFC tags + lector USB → conteo de botellas
- (Opcional) Balanzas ESP32 + HX711 → niveles en %
- Backend: tabla Sensores, LecturasSensor + Hub SignalR
- Admin Web: pantalla Inventario en vivo con cards
- App iPhone con Capacitor + iOS
- Notificaciones push (alertas de stock bajo)
- Apple Developer Account: $99 USD/año
- Esperar al menos 30 días de POS estable antes de arrancar

### FASE 4 — Web pública del bar
**Spec:** `specs/fase4_web_publica.md`
- Sitio Next.js + Vercel + dominio baravenida.mx
- Páginas: Home, Menú, Galería, Contacto
- Google My Business (postal de verificación 1-2 sem)
- Redes sociales optimizadas
- Sesión de fotos profesional ($3,000)
- **Total inicial: ~$3,200 MXN**

### FASE 5 — Robustez profesional (futuro)
- Tests automatizados backend (xUnit + integration tests)
- Sentry o Application Insights para alertas a celular
- Auto-update entre versiones Electron
- Documentación técnica con MkDocs Material

### FASE 6 — Features avanzadas (futuro)
- Chat asistente flotante en Admin (extensión IA.1)
- WhatsApp del bar para promociones
- Sistema loyalty / puntos
- Pidemusic (jukebox digital para clientes)
- Recomendaciones IA por cliente

---

## 📅 Cronograma sugerido

| Mes | Actividad |
|---|---|
| **Mes 1** | Round 3 cleanup → Test maratón en casa → Compra hardware → Mudanza al bar → Operación supervisada |
| **Mes 2** | Web pública + Google My Business + redes sociales optimizadas |
| **Mes 3** | Inventario IoT (sensores NFC) + App iPhone básica |
| **Mes 4-6** | Tests automatizados + Sentry + auto-update + docs técnicas |
| **Mes 6+** | Chat IA, WhatsApp, loyalty, Pidemusic |

---

## 📊 Estado financiero estimado

| Inversión | Monto | Cuándo |
|---|---|---|
| Hardware (FASE 3) | $45,500 MXN | Antes mudanza al bar |
| Web + dominio + fotos (FASE 4) | $3,200 MXN | Mes 2 |
| Apple Developer (FASE 2) | $1,800 MXN/año | Mes 3 |
| Sensores adicionales balanzas | $5,600 MXN | Mes 4-6 |
| **Total inicial estimado** | **~$56,000 MXN** | |

---

## 🎯 Indicadores de éxito

**3 meses después de operación:**
- 0 incidentes mayores (sistema cae en horario operación)
- Backups completos sin huecos
- 100% de cobros impresos correctamente
- Meseras usan tablets sin pedir ayuda
- 0 errores en logs Serilog (semana promedio)

**6 meses después:**
- 50+ reseñas Google 4.5+ estrellas
- Inventario IoT operativo en 10+ botellas premium
- App iPhone con notificaciones de stock funcionando
- Web atrae clientes nuevos medibles

**1 año después:**
- Sistema replicable a otro restaurante (otro dueño puede comprarlo y operarlo)
- Coronado decide si quiere monetizar el sistema vendiéndolo a otros bares de la región
