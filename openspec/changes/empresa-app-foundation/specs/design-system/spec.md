## Purpose

Define el lenguaje visual compartido y el mecanismo de tema por empresa que usan por igual el sitio público y la administración, para reutilizar una sola base de estilos sin duplicar componentes ni incrustar la marca de una empresa concreta.

## ADDED Requirements

### Requirement: Tokens visuales globales

El sistema MUST definir tokens de color, tipografía, espaciado, radios y estados como la única fuente de valores visuales, y los componentes MUST consumirlos en lugar de valores literales.

#### Scenario: Cambio de token se propaga

- **GIVEN** un componente que usa un token de espaciado o color
- **WHEN** se modifica el valor del token
- **THEN** todas las pantallas que lo consumen reflejan el cambio sin editar componentes

#### Scenario: Sin valores incrustados en componentes compartidos

- **GIVEN** un componente de `src/components`
- **WHEN** se inspecciona su origen
- **THEN** no contiene colores, textos ni marca de una empresa concreta incrustados

### Requirement: Tema por empresa mediante tokens

La interfaz MUST aplicar la identidad de la empresa activa sobrescribiendo tokens y MUST rechazar o degradar de forma segura un tema con contraste insuficiente.

#### Scenario: Empresa con tema propio

- **GIVEN** la configuración pública de una empresa con colores válidos
- **WHEN** se renderiza una pantalla de esa empresa
- **THEN** los tokens reflejan sus colores y ninguna otra empresa

#### Scenario: Tema inseguro

- **GIVEN** una configuración con contraste de texto insuficiente
- **WHEN** se valida el tema antes de renderizar
- **THEN** se usa el tema por defecto y no se inyecta CSS inseguro

### Requirement: Primitivas de layout y estados reutilizables

El sistema MUST ofrecer primitivas de layout y estados (carga, vacío, error) compartidas por el sitio público y la administración, sin lógica de negocio ni datos de empresa.

#### Scenario: Estados consistentes

- **GIVEN** una pantalla que necesita mostrar un estado vacío o de error
- **WHEN** usa una primitiva del sistema
- **THEN** el estado se muestra con el mismo lenguaje visual en cualquier módulo

#### Scenario: Reutilización entre sitios

- **GIVEN** una primitiva de layout del sistema
- **WHEN** se usa tanto en la portada pública como en la administración
- **THEN** se renderiza sin variaciones duplicadas por pantalla

### Requirement: Accesibilidad del sistema de diseño

Las pantallas construidas con el sistema MUST usar HTML semántico, foco visible y contraste suficiente, y MUST respetar la preferencia de movimiento reducido.

#### Scenario: Navegación por teclado

- **GIVEN** una pantalla construida con el sistema
- **WHEN** una persona navega con Tab
- **THEN** cada control es alcanzable con foco visible y en orden lógico

#### Scenario: Movimiento reducido

- **GIVEN** una persona con `prefers-reduced-motion: reduce`
- **WHEN** se carga una pantalla con transiciones
- **THEN** las animaciones no esenciales no se ejecutan
