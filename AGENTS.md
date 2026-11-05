# Instrucciones para agentes

- Lee `DESIGN.md` antes de crear páginas o componentes.
- Consulta documentación actual de Astro mediante Context7 cuando esté disponible; si no, usa la documentación oficial.
- Reutiliza componentes y tokens; no incrustes datos o marca de un tenant en componentes compartidos.
- Usa HTML semántico, foco visible, contraste suficiente y soporte para movimiento reducido.
- Mantén la hidratación de JavaScript limitada a las interacciones necesarias.
- Usa shadcn/ui para controles y patrones de interfaz: genera componentes con `npx shadcn@latest add <componente>` y reutiliza `src/components/ui`. No modifiques componentes generados sin una necesidad de producto documentada.
- Astro mantiene las páginas; usa componentes React para shadcn/ui y `client:*` solo cuando la interacción lo necesite.
- Separa llamadas API, tipos y presentación. No pongas secretos en variables `PUBLIC_`.
- Ejecuta `npm run check` y `npm run build` antes de entregar cambios.
- Para diseño consulta `.agents/skills/apple-design/SKILL.md`, `.agents/skills/emil-design-eng/SKILL.md` y `.agents/skills/frontend-design/SKILL.md`; para revisiones de accesibilidad consulta `.agents/skills/web-design-guidelines/SKILL.md`. Aplica solo lo pertinente a la tarea; las instrucciones del usuario y este archivo prevalecen.
- Para cambios funcionales, lee `openspec/config.yaml` y el cambio activo en `openspec/changes/`; mantén proposal, specs, design y tasks sincronizados mediante OPSX antes de implementar.
- En OpenCode usa los comandos generados `.opencode/commands/opsx-*.md`; el relevo está en `OPENCODE_HANDOFF.md`.

## Límite de tamaño, reutilización y validaciones (obligatorio)

- **Ningún archivo de código, estilos o configuración supera las 200 líneas.** Si una implementación crece más, se divide por responsabilidad en módulos cohesivos (por ejemplo `src/styles/admin/*.css`, un componente por archivo, funciones puras en `src/lib`).
- **Reutiliza antes de crear.** Usa los clientes de `src/lib`, las primitivas de `src/components/primitives`, los componentes de `src/components/ui`, los tokens de `src/styles` y los helpers existentes. No dupliques fetch, validaciones, formateos ni estilos: si una lógica se repite, extráela a `src/lib` o a un componente compartido.
- **Valida en el servidor antes de llamar a la API.** Toda entrada de formulario o `query`/`body` se normaliza y valida en el servidor con validadores compartidos y mensajes accionables; el cliente puede adelantar la validación, pero nunca sustituye la del servidor. No confíes en la empresa, precios, roles ni importes enviados por el navegador.
- **Buenas prácticas con bibliotecas.** Usa la API documentada y la versión instalada de Astro, React 19, Tailwind v4, shadcn/ui, Radix, Vitest y las utilidades del proyecto. Consulta Context7 cuando esté disponible; no reimplementes lo que la biblioteca ya ofrece ni modifiques componentes generados sin una necesidad de producto documentada.
- **Nuevas dependencias:** justifica por qué la biblioteca estándar o las dependencias actuales no alcanzan; revisa licencia, mantenimiento y tamaño antes de instalarla.
- **UI/UX:** aplica siempre `.agents/skills/impeccable/SKILL.md` (modo Operate para el panel), lee las referencias que correspondan antes de editar la interfaz y ejecuta el detector mecánico al terminar. Mantén HTML semántico, foco visible, contraste, estados de carga/vacío/error y `prefers-reduced-motion`.
- **Tailwind y CSS:** Tailwind v4 es la base (`src/styles/global.css` con `@import "tailwindcss"` y `@theme`); usa utilidades para layout/composición y las primitivas de `src/components/ui`. La capa semántica del panel vive en `src/styles/admin/` dividida por responsabilidad (tokens, shell, navegación, tablas, reportes, ventas, etc.), siempre por debajo de 200 líneas por archivo. No dupliques reglas de Tailwind ni crees un archivo nuevo si cabe en la sección existente.
- **Pruebas:** añade pruebas para la lógica pura y los contratos (Vitest) y verifica los estados y rutas afectadas. No ejecutes suites de verificación sin permiso explícito del usuario.
