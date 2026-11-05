## Purpose

Ofrecer a la empresa de la instalación una operación de inventario completa por sucursal: métricas, búsqueda, filtros, movimientos y transferencias, dentro del shell y detrás de la sesión de servidor.

## ADDED Requirements

### Requirement: Resumen y selección de sucursal

La pantalla `/admin/inventario` MUST mostrar las métricas de sucursales, productos, stock bajo y productos sin registro, y MUST permitir seleccionar una sucursal. Si no se elige ninguna, MUST usar la primera sucursal disponible.

#### Scenario: Sucursal por defecto

- **GIVEN** una empresa con al menos una sucursal
- **WHEN** se abre `/admin/inventario` sin `branchId`
- **THEN** se muestran las existencias de la primera sucursal y su selector activo

#### Scenario: Sin sucursales

- **GIVEN** una empresa sin sucursales
- **WHEN** se abre `/admin/inventario`
- **THEN** se muestra un estado vacío que invita a crear la primera

### Requirement: Filtros de existencias

La pantalla MUST permitir buscar por nombre o SKU y filtrar por estado (`stock bajo`, `agotado`, `disponible`, `sin registro`). El filtro de stock bajo MUST incluir agotados.

#### Scenario: Filtrar stock bajo

- **GIVEN** una sucursal con productos agotados y con stock de 10 unidades o menos
- **WHEN** se filtra por `stock bajo`
- **THEN** se muestran ambos grupos y no los productos con más de 10 unidades

#### Scenario: Búsqueda sin resultados

- **GIVEN** un texto que no coincide con ningún producto
- **WHEN** se envía la búsqueda
- **THEN** se muestra un estado vacío de resultados sin perder la sucursal seleccionada

### Requirement: Movimientos de inventario

La pantalla MUST permitir registrar entradas, salidas y ajustes con sucursal, producto y cantidad, validando en servidor antes de llamar a la API.

#### Scenario: Movimiento válido

- **GIVEN** una sucursal y un producto
- **WHEN** se registra una entrada con cantidad positiva
- **THEN** la página confirma la operación y el stock se actualiza

#### Scenario: Cantidad inválida

- **GIVEN** una cantidad negativa o vacía
- **WHEN** se envía el movimiento
- **THEN** se muestra el error y no se llama a la API

### Requirement: Transferencias entre sucursales

La pantalla MUST permitir transferir stock entre dos sucursales distintas de la empresa con producto y cantidad mayor que cero.

#### Scenario: Transferencia válida

- **GIVEN** dos sucursales distintas con stock en la sucursal origen
- **WHEN** se transfiere una cantidad positiva
- **THEN** la página confirma la operación y ambas sucursales reflejan el movimiento

#### Scenario: Origen igual a destino

- **GIVEN** el mismo valor en origen y destino
- **WHEN** se envía la transferencia
- **THEN** se muestra un error y no se llama a la API

#### Scenario: Stock insuficiente

- **GIVEN** una cantidad mayor al stock del origen
- **WHEN** se envía la transferencia
- **THEN** se muestra el conflicto del backend y no se altera el stock mostrado

### Requirement: Estados, errores y seguridad

La pantalla MUST distinguir carga, vacío, error y éxito, MUST reabrir el formulario que falló y MUST resolver la API solo en el servidor con la sesión BFF. El navegador MUST NOT recibir tokens ni la URL interna de la API.

#### Scenario: API no disponible

- **GIVEN** que el backend no responde
- **WHEN** se abre `/admin/inventario`
- **THEN** se muestra un mensaje temporal y ninguna lista con datos

#### Scenario: Formulario fallido

- **GIVEN** un movimiento rechazado por el backend
- **WHEN** la página redirige con el error
- **THEN** el formulario de movimiento vuelve a estar abierto con el mensaje legible

### Requirement: Responsive móvil

La tabla de existencias MUST convertirse en tarjetas apiladas con etiquetas en pantallas de hasta 640 px, y los formularios MUST apilarse sin desborde horizontal.

#### Scenario: Inventario en móvil

- **GIVEN** un viewport de 390 px
- **WHEN** se abre `/admin/inventario`
- **THEN** no hay scroll horizontal de la página, las tarjetas muestran sus etiquetas y los formularios ocupan el ancho disponible
