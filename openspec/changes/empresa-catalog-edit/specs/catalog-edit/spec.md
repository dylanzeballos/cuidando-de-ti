## Purpose

Permitir que la empresa de la instalación mantenga su catálogo correcto y vigente desde el panel, editando productos y aplicando baja lógica a productos y categorías, dentro del shell y detrás de la sesión de servidor.

## ADDED Requirements

### Requirement: Edición de productos

La pantalla `/admin/catalogo` MUST permitir editar nombre, marca, descripción, unidad, precio de venta, costo, categoría y estado de un producto. El SKU MUST NOT ser editable ni solicitarse al crear un producto: el backend lo genera a partir del identificador. La creación y la edición MUST abrirse en diálogos modales. La actualización MUST validarse en el servidor antes de llamar a la API con reglas compartidas con el navegador.

#### Scenario: Edición válida

- **GIVEN** un producto activo en el catálogo
- **WHEN** se cambia el precio y se guarda
- **THEN** la página confirma la actualización y la tabla muestra el nuevo precio

#### Scenario: Alta con SKU automático y marca

- **GIVEN** el formulario modal de nuevo producto
- **WHEN** se guarda sin escribir un SKU
- **THEN** el producto se crea con la marca indicada y un SKU generado visible en la tabla

#### Scenario: Precio inválido

- **GIVEN** un precio negativo o vacío
- **WHEN** se envía el formulario de edición
- **THEN** se muestra un error y no se llama a la API

#### Scenario: Edición rechazada por la API

- **GIVEN** un dato que el backend rechaza
- **WHEN** la página redirige con el error
- **THEN** el diálogo del producto vuelve a abrirse con el mensaje legible y los filtros se conservan

### Requirement: Estado de productos

La tabla de productos MUST permitir activar y desactivar cada producto. Desactivar MUST pedir confirmación y MUST usar baja lógica.

#### Scenario: Desactivar producto

- **GIVEN** un producto activo
- **WHEN** se confirma "Desactivar"
- **THEN** el producto queda inactivo y la tabla lo refleja

#### Scenario: Reactivar producto

- **GIVEN** un producto inactivo
- **WHEN** se pulsa "Activar"
- **THEN** el producto vuelve a estar activo sin pedir confirmación

### Requirement: Estado de categorías

La lista de categorías MUST permitir activar y desactivar cada categoría. Desactivar MUST pedir confirmación y MUST NOT eliminar sus productos.

#### Scenario: Desactivar categoría

- **GIVEN** una categoría activa con productos
- **WHEN** se confirma "Desactivar"
- **THEN** la categoría queda inactiva y sus productos se conservan

### Requirement: Autorización y estados

Todas las acciones MUST resolverse en el servidor con la sesión BFF; el navegador MUST NOT recibir tokens ni la URL interna de la API. La página MUST distinguir éxito, error y carga.

#### Scenario: Sesión ausente

- **GIVEN** una petición POST sin sesión válida
- **WHEN** se envía una edición
- **THEN** la petición se redirige al inicio de sesión y no se modifica el catálogo

#### Scenario: API no disponible

- **GIVEN** que el backend no responde
- **WHEN** se abre `/admin/catalogo`
- **THEN** se muestra un mensaje temporal y ninguna lista con datos

### Requirement: Diálogos accesibles

Los diálogos MUST cerrarse con Escape, con el botón de cierre y al hacer clic fuera de la tarjeta; MUST bloquear el scroll de fondo y MUST devolver el foco al elemento de origen. El movimiento MUST respetar `prefers-reduced-motion`.

#### Scenario: Cerrar el diálogo con Escape

- **GIVEN** el diálogo de edición abierto
- **WHEN** se pulsa Escape
- **THEN** el diálogo se cierra y la página vuelve a desplazarse

### Requirement: Responsive móvil

La tabla de productos MUST seguir mostrándose como tarjetas apiladas con etiquetas en pantallas de hasta 640 px, y el diálogo MUST caber en el ancho del viewport sin desborde horizontal.

#### Scenario: Catálogo en móvil

- **GIVEN** un viewport de 390 px
- **WHEN** se abre `/admin/catalogo` y se edita un producto
- **THEN** no hay scroll horizontal y el formulario del diálogo ocupa el ancho disponible
