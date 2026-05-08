# FASE 4 — Web pública del Bar Avenida

Página web profesional para Facebook, Google Maps, redes sociales y posicionamiento online.

---

## Objetivo

Que cuando alguien busque "Bar Avenida Saltillo" en Google, salga:
1. Ficha en Google Maps con foto, horarios, reseñas
2. Página web propia con menú destacado, ubicación, contacto
3. Link directo desde Facebook al sitio
4. Imagen profesional acorde al lugar

---

## Stack recomendado

**Frontend:** Next.js 15 (React + SSR para SEO)
**Hosting:** Vercel (gratis, dominio custom incluido)
**Dominio:** baravenida.mx (~$200 MXN/año en NIC México)
**Email profesional:** contacto@baravenida.mx (Zoho Mail gratis)

**Por qué Next.js:**
- SEO de fábrica (Google indexa bien)
- Hosting gratuito en Vercel con tu dominio custom
- Performance brutal (carga en <2s)
- Imágenes optimizadas automáticamente
- Igual stack que ya conoces (React)

---

## Estructura del sitio

```
baravenida.mx/
├── /                  Hero con foto del bar, horarios, "Cómo llegar"
├── /menu              Menú destacado (cervezas, tequilas, whiskys, cubetas)
├── /eventos           Eventos próximos (música en vivo, partidos)
├── /galeria           Fotos del bar (interior, ambiente, productos)
├── /contacto          Mapa Google, teléfono, WhatsApp directo, redes
└── /reservaciones     (Opcional, futuro) form para reservar mesas
```

---

## Diseño visual

**Paleta de colores** (consistente con app):
- Primario: dorado `#f0c842`
- Fondo: negro `#0a0a0a`
- Acento: cobrizo `#d4a017`
- Texto: blanco roto `#f5f5f5`

**Tipografía:**
- Headers: **Bebas Neue** (estilo bar/cantina, fuerte)
- Body: **Inter** (legible, profesional)
- Acento: **Playfair Display** para frases tipo "EL MEJOR LUGAR DE SALTILLO"

**Elementos visuales:**
- Hero con video loop del bar (5-10 segundos, sin sonido) o foto panorámica
- Texturas de cerveza/whisky de fondo en secciones
- Iconos de Lucide para amenidades (WiFi, parking, música, etc.)
- Animaciones suaves al hacer scroll (Framer Motion)
- Gradientes dorados en botones CTA

---

## Contenido sugerido

### Página Inicio

**Hero:**
> # Bar Avenida
> ## Tu cantina favorita en el corazón de Saltillo
>
> [VER MENÚ] [CÓMO LLEGAR]
>
> 📍 Calle Matamoros #1056, Zona Centro, Saltillo
> 🕐 Abierto Lun-Sáb 6pm-2am
> 📞 844 130 7069

**Sección "Por qué venir":**
- 🍺 Cervezas frías al mejor precio
- 🥃 Whiskys premium del mundo
- 🎵 Música en vivo viernes y sábados
- 📺 Partidos en pantallas grandes
- 🎱 Mesa de billar
- 🅿️ Estacionamiento

### Página Menú

Categorías con items destacados:
- **Cervezas** — Corona $40, Tecate $39, Indio $35, Modelo $42, Heineken $45
- **Cubetas** — Corona $400, Tecate $350, Modelo $450
- **Tequilas** — Don Julio Reposado, Maestro Dobel, Patrón Silver
- **Whiskys** — Buchanan's 12, Buchanan's 18, JW Etiqueta Negra
- **Botanas** — chicharrón, cacahuates, mezcla de la casa

(Generar desde el catálogo real del POS via export)

### Página Galería

10-15 fotos profesionales:
- Fachada de día/noche
- Interior con clientes
- Bar con botellas iluminadas
- Botanas en plato
- Mesa con cubetas
- Equipo de meseros

**Producción:** contratar fotógrafo profesional 1 día (~$3,000 MXN). Fotos pasan a otros usos: Facebook, Instagram, Google My Business.

### Página Contacto

- Mapa de Google embebido (Google Maps API gratis)
- Teléfono con click-to-call (móvil)
- Botón WhatsApp directo (`https://wa.me/528441307069`)
- Redes: Facebook, Instagram, TikTok
- Form de contacto (manda a contacto@baravenida.mx via Formspree gratis)

---

## SEO básico

- Meta tags optimizados (title, description, og:image)
- Sitemap.xml automático
- Robots.txt
- Schema.org `BarOrPub` markup para Google
- Open Graph tags para Facebook/WhatsApp previews

**Título Google:** "Bar Avenida Saltillo — Cantina, cervezas, whisky | Centro Saltillo"
**Descripción:** "Bar Avenida es tu cantina favorita en el centro de Saltillo. Cervezas frías, whiskys premium, música en vivo y ambiente único. Abierto de Lun a Sáb."

---

## Google My Business

**Acciones (gratis, alto impacto):**
1. Crear ficha en Google Business Profile (https://business.google.com)
2. Verificar dirección con tarjeta postal de Google (llega en 1-2 semanas)
3. Subir 10-15 fotos
4. Pedir reseñas a clientes regulares (mensaje WhatsApp con link directo)
5. Actualizar horarios y teléfono
6. Agregar amenidades: WiFi, parking, accesibilidad, etc.

**Resultado:** cuando alguien busque "bar saltillo centro", Bar Avenida aparece en el panel lateral de Google con foto, reseñas, horarios.

---

## Redes sociales

**Facebook Page:**
- Foto perfil: logo del bar
- Foto portada: panorámica del interior
- Sección "Acerca de" con descripción y horarios
- Botón "Llamar ahora" / "Enviar WhatsApp"
- Posts regulares: eventos, promociones, ambiente

**Instagram:**
- Bio con link a la web (link.tree opcional)
- Stories diarios del bar
- Reels los fines de semana

**TikTok (opcional, alta conversión jóvenes):**
- Videos cortos de eventos, drinks, ambiente

---

## Plan de implementación

**Etapa 1 — Sitio web (3-4 horas)**
1. Crear repo Next.js: `bar-avenida-web`
2. Diseño con Tailwind CSS + componentes
3. Páginas: Home, Menú, Galería, Contacto
4. Deploy en Vercel
5. Compra dominio baravenida.mx
6. Configurar DNS

**Etapa 2 — Contenido (1 día)**
1. Sesión fotos profesionales
2. Texto definitivo de cada sección
3. Lista completa del menú
4. Subir todo

**Etapa 3 — Google My Business (2 horas + 1-2 sem espera)**
1. Crear ficha
2. Solicitar verificación postal
3. Cuando llegue postal, ingresar código
4. Subir fotos
5. Pedir reseñas

**Etapa 4 — Redes sociales (continuo)**
1. Optimizar Facebook Page existente
2. Crear/optimizar Instagram
3. Estrategia de contenido semanal

---

## Costos

| Concepto | Costo |
|---|---|
| Dominio baravenida.mx (1 año) | $200 MXN |
| Hosting Vercel | Gratis |
| Email profesional Zoho | Gratis |
| Sesión fotos profesional | $3,000 MXN |
| **Total inicial** | **$3,200 MXN** |

**Mantenimiento:** $200/año por renovación dominio. Todo lo demás gratis.

---

## Resultado esperado

3-6 meses después de tener todo activo:
- Bar Avenida sale en Google al buscar "bar centro saltillo"
- 50-100 reseñas en Google con 4.5+ estrellas
- 5,000-10,000 visitas web/mes desde búsquedas
- Tráfico nuevo de gente que descubre el bar online
- Imagen profesional acorde al lugar

---

## Cuándo arrancar

Cuando el POS esté operando estable y tengas tiempo para:
1. Sesión de fotos
2. Redactar contenido
3. Estar disponible para verificación de Google (postal toma 1-2 semanas)

Esta fase se puede paralelizar con la operación normal del bar — no requiere que pares nada.
