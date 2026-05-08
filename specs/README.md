# Specs — Bar Avenida POS

Esta carpeta contiene specs detallados que Cowork (orquestador) genera
para que Claude Code los implemente desde el terminal en F:\BarAvenida.

## Convención

- Un archivo `.md` por feature/bloque grande.
- Formato sugerido: `<numero>_<nombre-corto>.md` (ej: `b3_solicitudes_admin.md`).
- Cada spec debe incluir:
  1. **Objetivo** — qué se va a construir y por qué.
  2. **Archivos a crear / modificar** — paths absolutos.
  3. **Contratos** — endpoints, props, eventos SignalR, shape de DTOs.
  4. **Reglas / restricciones** — temas de UX, performance, seguridad.
  5. **Criterios de aceptación** — checklist verificable.
  6. **Validación final** — comandos de build, pasos de prueba.

## Flujo

1. Cowork redacta el spec en esta carpeta.
2. Coronado se lo pasa a Claude Code (`claude` corriendo en F:\BarAvenida).
3. Claude Code implementa según el spec.
4. Cowork valida (lee diffs, corre build, revisa criterios).
5. Cowork actualiza CLAUDE.md con el avance.
