## Purpose

Ofrece a la empresa de la instalación una pantalla de administración, dentro del shell y detrás de la sesión de servidor, para gestionar su catálogo (categorías y productos) y su inventario (sucursales, stock y movimientos), sin exponer credenciales al navegador.

## ADDED Requirements

### Requirement: Administración de categorías y productos

La pantalla `/admin/catalogo` MUST renderizarse dentro del shell de administración y MUST listar las categorías y los productos de la empresa de la instalación, y MUST permitir crear una categoría y un producto mediante formularios. El producto MUST enviarse con SKU, nombre, unidad, precio e impuesto.

#### Scenario: Listar productos de la empresa

- **GIVEN** que la empresa de la instalación tiene productos registrados
- **WHEN** se abre `/admin/catalogo`
- **THEN** la página muestra la lista de productos de esa empresa y no de otra

#### Scenario: Crear un producto válido

- **GIVEN** un formulario de alta con SKU, nombre, unidad, precio e impuesto válidos
- **WHEN** se envía el formulario
- **THEN** el producto se crea y aparece en la lista con un mensaje de éxito

#### Scenario: Producto rechazado por el backend

- **GIVEN** un SKU que ya existe en la empresa
- **WHEN** se envía el formulario de producto
- **THEN** la página muestra un error legible y no duplica el producto

#### Scenario: Datos inválidos en el formulario

- **GIVEN** un precio negativo o un campo obligatorio vacío
- **WHEN** se intenta enviar el formulario
- **THEN** la página muestra el error del campo y no realiza la petición al backend

### Requirement: Administración de inventario

La pantalla `/admin/inventario` MUST renderizarse dentro del shell de administración y MUST listar las sucursales de la empresa de la instalación, MUST mostrar el stock de una sucursal y MUST permitir registrar un movimiento de entrada, salida o ajuste.

#### Scenario: Listar sucursales y stock

- **GIVEN** la empresa de la instalación tiene sucursales con stock
- **WHEN** se abre `/admin/inventario` y se elige una sucursal
- **THEN** la página muestra el stock de esa sucursal

#### Scenario: Registrar una entrada

- **GIVEN** una sucursal y un producto seleccionados
- **WHEN** se registra una entrada con una cantidad positiva
- **THEN** la página confirma el registro y el stock mostrado se actualiza

#### Scenario: Salida con stock insuficiente

- **GIVEN** una sucursal con stock menor que la cantidad solicitada
- **WHEN** se intenta registrar una salida
- **THEN** la página muestra el conflicto reportado por el backend y no altera el stock

### Requirement: Estados y errores de la administración

La administración MUST distinguir los estados de carga, error y vacío, y MUST mostrar un mensaje neutro cuando la API no está disponible, sin datos incorrectos ni de otra empresa.

#### Scenario: API no disponible

- **GIVEN** que el backend no responde
- **WHEN** se abre una pantalla de administración
- **THEN** se muestra un mensaje de error temporal y ninguna lista con datos

#### Scenario: Lista vacía

- **GIVEN** que la empresa no tiene productos
- **WHEN** se abre `/admin/catalogo`
- **THEN** se muestra un estado vacío con la invitación a crear el primero

### Requirement: Seguridad del acceso a la API

El acceso a la API MUST resolverse con la sesión de servidor (patrón BFF) que aporta `empresa-app-foundation`, y MUST ejecutarse solo en el servidor. La empresa MUST deducirse del servidor y no de un valor enviado por el cliente. El navegador MUST NOT recibir tokens ni una variable `PUBLIC_` con credenciales.

#### Scenario: Las credenciales no llegan al cliente

- **WHEN** se inspecciona el HTML y el JavaScript entregados al navegador en `/admin/catalogo`
- **THEN** no aparecen las credenciales de acceso ni la URL interna de la API

#### Scenario: Acceso sin sesión

- **GIVEN** que no hay sesión de servidor
- **WHEN** se intenta abrir una pantalla de administración
- **THEN** la petición se redirige a `/entrar` y no se llama a la API

### Requirement: Accesibilidad de los formularios

Las pantallas de administración MUST usar HTML semántico, etiquetas asociadas a los campos, foco visible y contraste suficiente, y MUST NOT hidratar React para contenido estático.

#### Scenario: Navegación por teclado

- **GIVEN** una pantalla de administración abierta
- **WHEN** una persona navega con Tab
- **THEN** cada campo y botón es alcanzable con foco visible y en orden lógico

#### Scenario: Formulario sin hidratación innecesaria

- **GIVEN** el HTML entregado por `/admin/catalogo`
- **WHEN** se inspecciona la página
- **THEN** los formularios estáticos no dependen de islas React hidratadas para renderizarse
