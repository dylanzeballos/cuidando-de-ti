# Diseño técnico

## Renderizado y dominio

Usar `@astrojs/node` en modo servidor. Cada petición obtiene el hostname desde la URL de la petición proporcionada por el adaptador. Confiar en cabeceras de proxy solo cuando el despliegue defina un proxy de confianza; no aceptar un parámetro de query del navegador para elegir la marca. Normalizar hostname a minúsculas y eliminar el punto final antes de consultar la API.

El servidor Astro consulta `GET /api/v1/public/site?domain=` del backend con una URL privada configurable. El contrato canónico está en `../plataforma-core-api/docs/contracts/empresa-site-v1.md`. Validar la forma de la respuesta antes de renderizarla; no convertir texto remoto en HTML sin escape.

## Presentación

Inyectar colores validados como variables CSS en el contenedor raíz. Los componentes shadcn/ui existentes se reutilizan; evitar variantes por empresa copiadas en archivos distintos. `siteName` y `description` alimentan título y metadatos. La navegación muestra solo módulos devueltos por la API; la visibilidad no equivale a autorización.

## Estados y caché

Un dominio desconocido produce una página 404 propia sin contenido incorrecto ni de otra empresa. Un error de red o 5xx produce 503 con mensaje temporal; no usar datos cacheados de otro dominio. Si se añade caché, su clave MUST incluir el dominio normalizado y respetar invalidación o TTL explícito. No exponer el endpoint interno ni secretos en variables `PUBLIC_`.

## Verificación

Probar dos dominios con marcas y módulos diferentes, un dominio no registrado, datos mal formados y API caída. Verificar salida HTML, metadatos, contraste, foco visible y ausencia de hidratación para componentes estáticos.
