## Purpose

Ofrece una estructura de administración reutilizable (encabezado, navegación, contenido y estados) cuyo menú se deriva de los módulos habilitados de la empresa, de modo que activar o desactivar funcionalidades sea configuración y no código nuevo.

## ADDED Requirements

### Requirement: Navegación por módulos habilitados

El shell de administración MUST generar su navegación a partir de los módulos habilitados de la empresa y MUST NOT mostrar accesos a módulos no habilitados.

#### Scenario: Módulo habilitado

- **GIVEN** una empresa con el módulo `inventory` habilitado
- **WHEN** se abre la administración
- **THEN** el menú incluye el acceso de inventario

#### Scenario: Módulo no habilitado

- **GIVEN** una empresa sin el módulo `billing` habilitado
- **WHEN** se abre la administración
- **THEN** el menú no muestra el acceso de facturación

#### Scenario: Activación sin código nuevo

- **GIVEN** una empresa a la que se habilita un módulo existente en configuración
- **WHEN** se recarga la administración
- **THEN** el nuevo acceso aparece sin modificar los componentes del shell

### Requirement: Estructura y estados del shell

El shell MUST presentar encabezado, navegación y área de contenido con landmark semánticos, MUST marcar la sección activa y MUST ofrecer estados de carga, vacío y error.

#### Scenario: Sección activa marcada

- **GIVEN** una persona situada en la sección de catálogo
- **WHEN** se renderiza la navegación
- **THEN** el acceso de catálogo se marca como la sección actual de forma accesible

#### Scenario: Pantalla estrecha

- **GIVEN** una pantalla de ancho reducido
- **WHEN** se abre la administración
- **THEN** la navegación sigue siendo utilizable y el contenido no se solapa

### Requirement: Accesibilidad del shell

El shell MUST conservar HTML semántico, foco visible y un orden de tabulación lógico, e MUST incluir un mecanismo para saltar al contenido principal.

#### Scenario: Salto al contenido

- **GIVEN** la administración abierta
- **WHEN** una persona navega con teclado desde el inicio de la página
- **THEN** puede saltar al contenido principal sin recorrer toda la navegación

### Requirement: Integración de las pantallas existentes

Las pantallas de administración existentes MUST renderizarse dentro del shell compartido sin duplicar su estructura.

#### Scenario: Catálogo dentro del shell

- **GIVEN** una persona autenticada en la sección de catálogo
- **WHEN** se abre la pantalla
- **THEN** el contenido aparece en el área del shell con la navegación y el encabezado comunes
