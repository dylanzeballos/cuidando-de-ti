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
