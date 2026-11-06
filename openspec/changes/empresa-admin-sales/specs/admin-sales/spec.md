## Purpose

Permite a la farmacia cobrar en caja: abrir y cerrar un turno, armar y registrar una venta con sus productos y método de pago, emitir el ticket, consultar el historial y su detalle, anular una venta y registrar devoluciones, reutilizando el shell, la sesión de servidor (BFF) y el sistema de diseño de la instalación de una sola empresa.

## ADDED Requirements

### Requirement: Apertura y cierre del turno de caja

La aplicación MUST permitir abrir un turno de caja con un monto inicial y cerrarlo mostrando un resumen, y MUST exigir un turno abierto para registrar ventas.

#### Scenario: Abrir un turno

- **GIVEN** una persona autenticada en la administración sin turno abierto
- **WHEN** abre la caja indicando un monto inicial válido
- **THEN** se crea el turno y la pantalla de ventas queda disponible para operar

#### Scenario: Cerrar un turno con resumen

- **GIVEN** un turno abierto con ventas registradas
- **WHEN** se cierra la caja
- **THEN** se muestra un resumen con la cantidad de ventas, el total por método de pago y el monto de cierre, y el turno deja de aceptar ventas

#### Scenario: Venta sin turno abierto

- **GIVEN** una persona autenticada sin turno abierto
- **WHEN** intenta registrar una venta
- **THEN** la aplicación impide registrar la venta y pide abrir la caja primero

### Requirement: Armado y registro de una venta

La aplicación MUST permitir buscar productos del catálogo, agregarlos como líneas, ajustar sus cantidades y calcular el total, y MUST registrar la venta con el método de pago elegido.

#### Scenario: Agregar productos y calcular el total

- **GIVEN** el armado de una venta abierto con productos disponibles en el catálogo
- **WHEN** se agregan productos y se ajustan sus cantidades
- **THEN** el total se recalcula con los precios del catálogo y refleja las líneas agregadas

#### Scenario: Registrar la venta con método de pago

- **GIVEN** una venta con al menos una línea y un método de pago válido elegido
- **WHEN** se confirma la venta
- **THEN** la venta se registra en el turno abierto y queda disponible en el historial

#### Scenario: Venta vacía o inválida

- **GIVEN** un armado de venta sin líneas o con una cantidad no válida
- **WHEN** se intenta confirmar
- **THEN** se muestra el error correspondiente y no se registra ninguna venta

#### Scenario: Cantidad fuera de existencia

- **GIVEN** una línea cuya cantidad supera la existencia disponible reportada por la API
- **WHEN** se confirma la venta
- **THEN** la API rechaza la operación por conflicto y se muestra un mensaje legible sin registrar la venta

### Requirement: Emisión del ticket de venta

La aplicación MUST emitir un ticket o comprobante de cada venta registrada con folio, líneas, total y método de pago.

#### Scenario: Ticket de una venta registrada

- **GIVEN** una venta registrada correctamente
- **WHEN** se solicita su ticket
- **THEN** se muestra un comprobante con folio, fecha, líneas con cantidades y precios, total y método de pago

#### Scenario: Ticket disponible desde el historial

- **GIVEN** una persona en el historial de ventas
- **WHEN** abre el detalle de una venta registrada
- **THEN** puede consultar o volver a emitir su ticket

### Requirement: Historial y detalle de ventas

La aplicación MUST mostrar el historial de ventas con su estado y MUST permitir consultar el detalle de cada venta.

#### Scenario: Listar ventas

- **GIVEN** una persona autenticada con ventas registradas
- **WHEN** abre el historial
- **THEN** se listan las ventas con su folio, fecha, total, método de pago y estado

#### Scenario: Detalle de una venta

- **GIVEN** una venta en el historial
- **WHEN** se abre su detalle
- **THEN** se muestran sus líneas, su método de pago, sus totales y las devoluciones asociadas si existen

#### Scenario: Historial vacío

- **GIVEN** una empresa sin ventas registradas
- **WHEN** se abre el historial
- **THEN** se muestra un estado vacío sin datos de ventas

### Requirement: Anulación de ventas

La aplicación MUST permitir anular una venta registrada y MUST reflejar el estado anulado en el historial y en el detalle.

#### Scenario: Anular una venta

- **GIVEN** una venta registrada no anulada
- **WHEN** una persona autenticada confirma su anulación
- **THEN** la venta pasa a estado anulado, se refleja en el historial y reintegra el stock asociado

#### Scenario: Anular una venta ya anulada

- **GIVEN** una venta anulada
- **WHEN** se intenta anular de nuevo
- **THEN** la aplicación impide la operación con un mensaje legible y no repite el reintegro

### Requirement: Registro de devoluciones

La aplicación MUST permitir registrar devoluciones parciales o totales de una venta y MUST reintegrar el stock de los productos devueltos.

#### Scenario: Devolución parcial

- **GIVEN** una venta registrada con varias líneas
- **WHEN** se registra la devolución de una parte de sus líneas
- **THEN** la devolución queda asociada a la venta, se reintegra el stock correspondiente y el detalle refleja el importe devuelto

#### Scenario: Devolución que excede lo vendido

- **GIVEN** una venta con una cantidad vendida por línea
- **WHEN** se intenta devolver más cantidad de la vendida
- **THEN** la aplicación impide la devolución con un mensaje legible y no reintegra stock

### Requirement: Interacción del POS y render en servidor

La aplicación MUST hidratar React únicamente en el armado de la venta (buscador, detalle de venta, cantidades, total y método de pago) y MUST renderizar en servidor, sin hidratación, el historial, el detalle y la caja.

#### Scenario: El POS es una isla hidratada

- **GIVEN** la pantalla de armado de venta
- **WHEN** se inspecciona el HTML entregado al navegador
- **THEN** solo el componente de armado de la venta lleva directiva de hidratación y el resto se sirve sin JavaScript de React

#### Scenario: El historial no se hidrata

- **GIVEN** el historial o el detalle de una venta
- **WHEN** se inspecciona el HTML entregado
- **THEN** la pantalla se renderiza en servidor sin hidratar componentes interactivos

### Requirement: Accesibilidad del POS

El POS MUST usar HTML semántico, MUST asociar las etiquetas a sus controles, MUST mostrar foco visible y MUST anunciar los cambios de estado y los errores, y MUST respetar la preferencia de movimiento reducido.

#### Scenario: Operar el POS por teclado

- **GIVEN** la pantalla de armado de venta abierta
- **WHEN** una persona navega con Tab y opera el buscador, las cantidades y el método de pago
- **THEN** cada control es alcanzable con foco visible y en orden lógico

#### Scenario: Total y errores anunciados

- **GIVEN** un cambio en el detalle de venta o un error de la API
- **WHEN** el total se actualiza o se produce el error
- **THEN** el cambio de total y el mensaje de error se anuncian a la tecnología de asistencia

### Requirement: Empresa de la instalación y patrón BFF

La aplicación MUST resolver la empresa y la identidad desde la sesión de servidor y MUST NOT exponer tokens al navegador ni aceptar la empresa desde un valor enviado por el cliente.

#### Scenario: Operaciones contra la empresa de la instalación

- **GIVEN** una persona autenticada en la instalación de una sola empresa
- **WHEN** registra una venta, la anula o registra una devolución
- **THEN** la operación se realiza contra la empresa de esa instalación y no contra una enviada por el navegador

#### Scenario: Sin tokens en el cliente

- **GIVEN** cualquier pantalla de ventas
- **WHEN** se inspecciona el HTML y el JavaScript entregados al navegador
- **THEN** no aparece ningún token de acceso ni credencial

### Requirement: Estados de carga, vacío y error de la API

La aplicación MUST distinguir los estados de carga, vacío y error y MUST NOT mostrar datos de ventas ante un fallo de la API.

#### Scenario: API de ventas no disponible

- **GIVEN** que el servicio de ventas no responde
- **WHEN** se abre el historial, el detalle o la caja
- **THEN** se muestra un mensaje temporal neutro y ninguna tabla o total con datos

#### Scenario: Carga en curso

- **GIVEN** un historial o turno cuya consulta está en curso
- **WHEN** se renderiza la pantalla
- **THEN** se muestra un estado de carga en lugar de datos parciales
