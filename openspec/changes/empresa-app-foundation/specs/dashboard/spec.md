## Purpose

Ofrece una página de inicio de la administración que resume los módulos habilitados de la empresa y da acceso rápido a sus secciones, con estados de carga, vacío y error y sin exponer datos de módulos no habilitados.

## ADDED Requirements

### Requirement: Resumen de módulos habilitados

El panel de inicio MUST mostrar los módulos habilitados de la empresa y MUST NOT mostrar los módulos no habilitados.

#### Scenario: Módulos activos

- **GIVEN** una empresa con módulos habilitados
- **WHEN** se abre el panel de inicio
- **THEN** se listan esos módulos, cada uno con acceso a su sección

#### Scenario: Sin módulos de negocio

- **GIVEN** una empresa sin módulos adicionales habilitados
- **WHEN** se abre el panel de inicio
- **THEN** se muestra un estado vacío con la invitación a configurar módulos, sin datos de negocio

### Requirement: Estados del panel

El panel MUST distinguir los estados de carga, error y vacío y MUST NOT mostrar datos de módulos ante un fallo de la API.

#### Scenario: API no disponible

- **GIVEN** que el servicio de configuración de la empresa no responde
- **WHEN** se abre el panel de inicio
- **THEN** se muestra un mensaje temporal y ninguna tarjeta con datos

### Requirement: Accesibilidad del panel

El panel MUST usar HTML semántico y foco visible y MUST NOT hidratar React para contenido estático.

#### Scenario: Navegación por teclado

- **GIVEN** el panel de inicio abierto
- **WHEN** una persona navega con Tab
- **THEN** cada acceso es alcanzable con foco visible y en orden lógico
