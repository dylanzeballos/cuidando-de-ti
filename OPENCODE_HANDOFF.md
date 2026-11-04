# Relevo SDD para OpenCode

## Estado

OpenSpec OPSX está inicializado para OpenCode. El cambio `tenant-aware-web-shell` tiene propuesta, especificación, diseño y tareas completos; sus tareas de implementación siguen pendientes. El contrato canónico vive en `../plataforma-core-api/docs/contracts/tenant-site-v1.md`.

## Orden de trabajo

1. Abrir OpenCode en este repositorio después de que el backend publique el contrato, o usar un fixture local compatible durante el desarrollo.
2. Revisar `AGENTS.md`, `DESIGN.md` y `openspec/changes/tenant-aware-web-shell/`.
3. Pedir al agente principal de OpenCode: `Usa el subagente sdd-executor para aplicar el cambio tenant-aware-web-shell con OPSX.` También se puede ejecutar directamente `/opsx-apply tenant-aware-web-shell`.
4. Marcar tareas completadas; ejecutar `npm run check` y `npm run build`. Si el contrato cambia, usar `/opsx-update tenant-aware-web-shell` antes de continuar.
5. Tras implementar y verificar, usar `/opsx-sync tenant-aware-web-shell` y `/opsx-archive tenant-aware-web-shell`.

La CLI de OpenSpec se usa en terminal, por ejemplo `npx @fission-ai/openspec@1.14.1 status --change tenant-aware-web-shell` y `npx @fission-ai/openspec@1.14.1 validate tenant-aware-web-shell --strict`. Los comandos `/opsx-*` se escriben en el chat de OpenCode.
