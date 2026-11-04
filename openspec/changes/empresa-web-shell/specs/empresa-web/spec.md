## ADDED Requirements

### Requirement: Resolución de sitio por dominio
La página pública MUST obtener la configuración de la empresa correspondiente al hostname normalizado de la petición mediante el contrato público del backend.

#### Scenario: Empresa conocida
- GIVEN una petición para un dominio registrado
- WHEN Astro renderiza la portada
- THEN muestra el nombre, descripción y tema de esa empresa.

#### Scenario: Dos dominios distintos
- GIVEN dos dominios registrados con configuraciones diferentes
- WHEN se renderizan ambas páginas
- THEN cada respuesta muestra solo la marca y los módulos de su dominio.

### Requirement: Navegación por módulos visibles
La portada MUST mostrar únicamente módulos enumerados en la configuración pública; la visibilidad MUST NOT autorizar acciones de negocio.

#### Scenario: Módulo no habilitado
- GIVEN una empresa sin el módulo `crm` en su configuración pública
- WHEN se renderiza la portada
- THEN no se muestra una entrada de navegación para CRM.

### Requirement: Estados seguros
La página MUST distinguir dominio desconocido de fallo temporal del backend y MUST NOT reutilizar datos incorrectos ni de otra empresa como sustituto.

#### Scenario: Dominio desconocido
- GIVEN una respuesta 404 del endpoint público
- WHEN se solicita la portada
- THEN Astro responde 404 con una página neutra.

#### Scenario: API temporalmente indisponible
- GIVEN un error de red o 5xx del backend
- WHEN se solicita la portada
- THEN Astro responde 503 con una página neutra sin datos incorrectos ni de otra empresa.

#### Scenario: Respuesta inválida
- GIVEN una respuesta 200 con forma o colores inválidos
- WHEN Astro valida la configuración
- THEN rechaza esa respuesta y muestra un estado seguro sin inyectar CSS o HTML no confiable.

### Requirement: Accesibilidad y carga mínima
La portada MUST conservar HTML semántico, foco visible y contraste suficiente, y MUST renderizar componentes estáticos sin hidratación de React.

#### Scenario: Navegación por teclado
- GIVEN la portada de una empresa
- WHEN una persona navega mediante Tab
- THEN los controles muestran foco visible y mantienen un orden lógico.
