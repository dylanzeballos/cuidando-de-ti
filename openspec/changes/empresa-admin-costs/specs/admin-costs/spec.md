## Purpose

Permite a la empresa registrar el costo de compra de cada producto por sucursal, compararlo con su precio de venta para conocer el margen, y registrar y totalizar sus gastos y costos operativos por periodo, sin exponer credenciales al navegador y usando la empresa de la instalación.

## ADDED Requirements

### Requirement: Costo de compra por producto y sucursal

La pantalla `/admin/costos` MUST listar los productos de la empresa con su precio de venta vigente y MUST permitir registrar o actualizar el costo de compra de un producto para una sucursal. Un costo MUST ser un monto no negativo en la moneda de la empresa.

#### Scenario: Listar productos con su costo y margen

- **GIVEN** una empresa con productos y al menos un costo registrado
- **WHEN** se abre `/admin/costos`
- **THEN** la página muestra cada producto con su precio de venta, su costo y el margen calculado

#### Scenario: Registrar un costo válido

- **GIVEN** un producto y una sucursal de la empresa seleccionados
- **WHEN** se registra un costo de compra no negativo y válido
- **THEN** la página confirma el registro y el listado refleja el costo y el margen actualizados

#### Scenario: Costo inválido

- **GIVEN** un costo negativo o un monto no numérico
- **WHEN** se intenta enviar el formulario
- **THEN** la página muestra el error del campo y no realiza la petición al backend

#### Scenario: Producto sin costo registrado

- **GIVEN** un producto sin costo registrado para la sucursal elegida
- **WHEN** se abre `/admin/costos`
- **THEN** el producto se muestra en estado sin costo y no se presenta un margen calculado como si existiera

### Requirement: Margen frente al precio de venta

La comparación entre el costo de compra y el precio de venta MUST calcularse por producto y sucursal, MUST mostrarse cuando existen ambos valores y MUST distinguir un margen negativo sin ocultarlo.

#### Scenario: Margen positivo

- **GIVEN** un producto con precio de venta mayor que su costo de compra
- **WHEN** se muestra su fila en `/admin/costos`
- **THEN** se presenta un margen positivo calculado a partir de ambos valores

#### Scenario: Margen negativo

- **GIVEN** un producto con costo de compra mayor que su precio de venta
- **WHEN** se muestra su fila en `/admin/costos`
- **THEN** se presenta el margen negativo de forma explícita y no como un valor ausente

### Requirement: Gastos y costos operativos por periodo

La pantalla `/admin/gastos` MUST permitir registrar un gasto o costo operativo indicando concepto, monto y periodo, MUST listar los registros del periodo y MUST mostrar el total del periodo consultado.

#### Scenario: Registrar un gasto

- **GIVEN** un concepto, un monto no negativo y un periodo válidos
- **WHEN** se envía el formulario de gasto
- **THEN** el gasto se registra y aparece en el listado con el total del periodo actualizado

#### Scenario: Listado y total del periodo

- **GIVEN** una empresa con gastos registrados en un periodo
- **WHEN** se abre `/admin/gastos` para ese periodo
- **THEN** la página lista los gastos del periodo y muestra su total

#### Scenario: Periodo sin gastos

- **GIVEN** un periodo sin gastos registrados
- **WHEN** se abre `/admin/gastos` para ese periodo
- **THEN** se muestra un estado vacío y un total de cero, sin un error

#### Scenario: Gasto rechazado por el backend

- **GIVEN** un gasto que el backend rechaza
- **WHEN** se envía el formulario
- **THEN** la página muestra un error legible y no añade el registro al listado

### Requirement: Estados de carga, vacío y error

Las pantallas de costos y gastos MUST distinguir los estados de carga, vacío y error, y MUST mostrar un mensaje neutro y ninguna lista con datos cuando la API no está disponible.

#### Scenario: Carga en curso

- **GIVEN** una consulta a la API en curso
- **WHEN** se abre la pantalla
- **THEN** se muestra un estado de carga accesible hasta recibir la respuesta

#### Scenario: API no disponible

- **GIVEN** que el backend no responde o devuelve un error temporal
- **WHEN** se abre una pantalla de costos o gastos
- **THEN** se muestra un mensaje de error temporal y ninguna lista con datos

#### Scenario: Lista vacía de productos

- **GIVEN** que la empresa no tiene productos en el catálogo
- **WHEN** se abre `/admin/costos`
- **THEN** se muestra un estado vacío que invita a registrar productos en el catálogo

### Requirement: Sesión, empresa de la instalación y patrón BFF

Las pantallas de costos y gastos MUST usar el shell y la sesión de la administración, MUST resolver la empresa desde la sesión de servidor y MUST NOT recibir el token de acceso ni la URL interna de la API en el navegador.

#### Scenario: Acceso sin sesión

- **GIVEN** una persona sin sesión de administración
- **WHEN** solicita `/admin/costos` o `/admin/gastos`
- **THEN** se redirige al inicio de sesión y no se muestran datos

#### Scenario: La empresa proviene de la sesión

- **GIVEN** una persona autenticada en una instalación de una sola empresa
- **WHEN** se cargan los costos o los gastos
- **THEN** las consultas usan la empresa de la sesión y no un valor tomado de `query`, `body` ni del navegador

#### Scenario: El token no llega al cliente

- **WHEN** se inspecciona el HTML y el JavaScript entregados al navegador en `/admin/costos` y `/admin/gastos`
- **THEN** no aparece el token de acceso ni la URL interna de la API

#### Scenario: Módulo de costos no habilitado

- **GIVEN** una empresa sin el módulo `costs` habilitado
- **WHEN** se abre la administración
- **THEN** la navegación no muestra los accesos de costos ni de gastos, sin que ello sustituya la autorización del backend

### Requirement: Accesibilidad de las pantallas

Las pantallas de costos y gastos MUST usar HTML semántico, etiquetas asociadas a los campos, foco visible y contraste suficiente, MUST ordenar la tabulación de forma lógica y MUST respetar la preferencia de movimiento reducido, sin hidratar React para contenido estático.

#### Scenario: Navegación por teclado

- **GIVEN** una pantalla de costos o gastos abierta
- **WHEN** una persona navega con Tab
- **THEN** cada campo, enlace y botón es alcanzable con foco visible y en orden lógico

#### Scenario: Mensajes anunciables

- **GIVEN** un registro guardado o un error de validación
- **WHEN** se actualiza la pantalla
- **THEN** el mensaje resultante se anuncia de forma accesible sin depender solo del color
