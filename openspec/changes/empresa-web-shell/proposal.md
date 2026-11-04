# Interfaz pública adaptada por empresa

## Why

La portada actual contiene marca, textos y módulos estáticos. Para reutilizarla entre empresas se necesita resolver el dominio en el servidor, leer la configuración pública de la API y aplicar un tema sin duplicar el frontend.

## What Changes

- Pasar la página pública a renderizado en servidor con el adaptador de Node de Astro.
- Consultar la configuración pública del sitio por dominio usando el contrato del backend hermano.
- Aplicar nombre, descripción, colores y módulos visibles mediante tokens CSS y componentes existentes de shadcn/ui.
- Mostrar estados seguros para dominio desconocido y fallo temporal de la API.

## Scope

Este cambio afecta solo a la portada y a la infraestructura de configuración pública. No implementa checkout, sesión de usuario, panel ERP/CRM ni autenticación.

## Dependencies

Depende del cambio del backend hermano `../plataforma-core-api/openspec/changes/empresa-core` y de su contrato `docs/contracts/empresa-site-v1.md`. Se puede desarrollar contra un fixture local del contrato mientras el backend se implementa.

## Rollback

Revertir el despliegue Astro si falla la resolución por dominio. Mantener una página de error genérica que no muestre datos incorrectos ni de otra empresa. No almacenar configuración de empresa en el navegador como fuente de autoridad.
