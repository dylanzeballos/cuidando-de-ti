## Purpose

Permitir que la empresa de la instalación consulte y opere sus costos de compra por producto y sucursal, y sus gastos operativos por periodo, con métricas, filtros y formularios modales dentro del shell y detrás de la sesión de servidor.

## ADDED Requirements

### Requirement: Resumen de costos

La pantalla `/admin/costos` MUST mostrar el total de productos, cuántos tienen costo, cuántos no y el margen promedio porcentual de la sucursal seleccionada.

#### Scenario: Sucursal con y sin costos

- **GIVEN** una sucursal con productos con costo y sin costo
- **WHEN** se abre `/admin/costos`
- **THEN** las métricas muestran ambos grupos y el margen promedio solo de los productos con costo

#### Scenario: Sin margen calculable

- **GIVEN** una sucursal sin productos con costo
- **WHEN** se abre `/admin/costos`
- **THEN** el margen promedio se muestra como un guion y no como cero

### Requirement: Filtros de márgenes

La pantalla MUST permitir buscar por nombre o SKU y filtrar por `todos`, `con costo`, `sin costo` o `margen negativo`, conservando la sucursal seleccionada.

#### Scenario: Filtrar margen negativo

- **GIVEN** productos con margen positivo y negativo
- **WHEN** se filtra por `margen negativo`
- **THEN** solo se listan los productos cuyo margen es menor que cero

### Requirement: Registro de costo

La pantalla MUST permitir registrar un costo con producto, sucursal, monto no negativo y fecha de vigencia. La validación MUST ocurrir en el servidor antes de llamar a la API. La tabla MUST ofrecer una acción por producto que abra el formulario con producto y sucursal preseleccionados.

#### Scenario: Costo válido

- **GIVEN** un producto y una sucursal
- **WHEN** se registra un costo con monto y fecha válidos
- **THEN** la página confirma el alta y el margen se actualiza

#### Scenario: Monto inválido

- **GIVEN** un costo negativo o vacío
- **WHEN** se envía el formulario
- **THEN** se muestra el error y no se llama a la API

#### Scenario: Acción por producto sin costo

- **GIVEN** una fila de márgenes sin costo
- **WHEN** se pulsa `+`
- **THEN** el diálogo de costo se abre con el producto y la sucursal de la fila

#### Scenario: Acción por producto con costo

- **GIVEN** una fila con costo vigente
- **WHEN** se pulsa el lápiz
- **THEN** el diálogo se abre como “Actualizar costo” con el producto y la sucursal de la fila

#### Scenario: Alta rechazada

- **GIVEN** un costo rechazado por la API
- **WHEN** la página redirige con el error
- **THEN** el diálogo de costo vuelve a abrirse con el mensaje legible

### Requirement: Resumen de gastos

La pantalla `/admin/gastos` MUST mostrar total, cantidad, promedio y número de categorías del periodo filtrado.

#### Scenario: Periodo con gastos

- **GIVEN** un periodo con gastos en dos categorías
- **WHEN** se abre `/admin/gastos`
- **THEN** las métricas muestran el total, la cantidad, el promedio y dos categorías

### Requirement: Filtros de gastos

La pantalla MUST permitir filtrar por mes, categoría y sucursal. El listado y los totales MUST usar los mismos filtros.

#### Scenario: Filtrar por categoría

- **GIVEN** gastos de varias categorías en un mes
- **WHEN** se filtra por una categoría
- **THEN** la tabla, el total y las barras muestran solo esa categoría

### Requirement: Registro de gasto

La pantalla MUST permitir registrar un gasto con categoría, descripción, monto no negativo, fecha y sucursal opcional, validando en el servidor.

#### Scenario: Gasto válido

- **GIVEN** el periodo visible
- **WHEN** se registra un gasto con fecha del periodo
- **THEN** la página confirma el alta y el gasto aparece en la tabla y en los totales

#### Scenario: Campos obligatorios

- **GIVEN** una categoría o descripción vacía
- **WHEN** se envía el formulario
- **THEN** se muestra el error y no se llama a la API

### Requirement: Diálogos y responsive

Los formularios de costo y gasto MUST mostrarse en diálogos modales que cierran con Escape, botón y clic fuera, y MUST reabrirse tras un error. Las tablas MUST convertirse en tarjetas con etiquetas en pantallas de hasta 640 px y no MUST producir scroll horizontal.

#### Scenario: Gastos en móvil

- **GIVEN** un viewport de 390 px
- **WHEN** se abre `/admin/gastos`
- **THEN** la tabla se muestra como tarjetas y la página no tiene scroll horizontal

### Requirement: Seguridad

Las acciones MUST resolverse en el servidor con la sesión BFF; el navegador MUST NOT recibir tokens ni la URL interna de la API.

#### Scenario: Sesión ausente

- **GIVEN** una petición POST sin sesión válida
- **WHEN** se envía un costo o gasto
- **THEN** se redirige al inicio de sesión y no se registra nada
