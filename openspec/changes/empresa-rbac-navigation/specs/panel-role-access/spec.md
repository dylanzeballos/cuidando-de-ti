## Purpose

Adaptar el panel a los permisos efectivos de cada cuenta: mostrar solo las
secciones disponibles, bloquear las rutas no autorizadas y mantener el contexto
de la pantalla al cambiar de sucursal.

## ADDED Requirements

### Requirement: Navegación según permisos

El panel MUST ocultar los módulos para los que la cuenta no tiene permiso
efectivo y MUST mantener el backend como autoridad de cada operación.

#### Scenario: Rol de solo ventas

- **GIVEN** una cuenta con solo el permiso `sales.manage`
- **WHEN** abre el panel
- **THEN** la navegación muestra Inicio y Ventas, y no muestra Catálogo,
  Inventario, Costos, Reportes, Facturación ni Configuración

#### Scenario: Perfil no disponible

- **GIVEN** que el perfil no se puede consultar por un fallo temporal
- **WHEN** la cuenta abre una sección de `/admin/**`
- **THEN** el panel responde con un estado de servicio no disponible y no
  muestra opciones ni secciones que no pueda verificar

### Requirement: Bloqueo de rutas por URL

El panel MUST impedir que una cuenta renderice una sección de `/admin/**` sin el
permiso correspondiente, incluso si escribe la URL directamente.

#### Scenario: URL sin permiso

- **GIVEN** una cuenta sin `costs.manage`
- **WHEN** solicita `/admin/costos` o una subruta
- **THEN** el panel responde con una página 403 y no carga la sección

#### Scenario: URL permitida

- **GIVEN** una cuenta con `sales.manage`
- **WHEN** solicita `/admin/ventas/historial`
- **THEN** el panel renderiza la sección

### Requirement: Inicio adaptado a la cuenta

El panel de inicio MUST ocultar tarjetas, paneles y enlaces rápidos de módulos
sin permiso.

#### Scenario: Inicio de solo ventas

- **GIVEN** una cuenta con solo `sales.manage`
- **WHEN** abre `/admin`
- **THEN** ve las métricas de venta y los gráficos de ventas, sin métricas de
  costos, inventario ni enlaces a catálogo o inventario

### Requirement: Selector de sucursal contextual

El selector de sucursal MUST conservar la sección y los filtros de la pantalla
que lo contiene.

#### Scenario: Cambiar de sucursal en costos

- **GIVEN** una cuenta en `/admin/costos` con una búsqueda o un estado aplicado
- **WHEN** elige otra sucursal
- **THEN** permanece en `/admin/costos` con la nueva sucursal y los mismos
  filtros

#### Scenario: Cambiar de sucursal en inventario

- **GIVEN** una cuenta en `/admin/inventario`
- **WHEN** elige otra sucursal
- **THEN** permanece en `/admin/inventario` con la nueva sucursal
