## Purpose

Ofrece la administración de identidad de la empresa dentro del shell y la sesión de servidor: gestionar usuarios (listar, crear, activar/desactivar y asignar roles) y definir roles con permisos configurables por módulo habilitado, sin exponer tokens al navegador y resolviendo siempre la empresa de la instalación.

## ADDED Requirements

### Requirement: Listado de usuarios de la empresa

La administración MUST listar los usuarios de la empresa de la instalación con su estado (activo o inactivo) y sus roles, MUST resolver los datos desde el servidor y MUST NOT solicitar ni aceptar un identificador de empresa desde el cliente.

#### Scenario: Usuarios existentes

- **GIVEN** una empresa con usuarios registrados
- **WHEN** una persona autenticada abre la administración de usuarios
- **THEN** se listan los usuarios con su estado y roles

#### Scenario: Sin usuarios

- **GIVEN** una empresa sin usuarios adicionales
- **WHEN** se abre la administración de usuarios
- **THEN** se muestra un estado vacío con la invitación a crear el primero y ninguna fila de datos

#### Scenario: Empresa de la instalación

- **GIVEN** una persona autenticada en la instalación de una sola empresa
- **WHEN** solicita el listado de usuarios
- **THEN** los datos corresponden a la empresa de esa instalación y no a una enviada por el cliente

### Requirement: Alta de usuario

La administración MUST permitir crear un usuario con los datos requeridos, MUST validar los campos en el servidor antes de llamar a la API y MUST mostrar un error legible cuando la creación falla.

#### Scenario: Creación válida

- **GIVEN** datos de usuario válidos
- **WHEN** se envía el formulario de alta
- **THEN** el usuario se crea y aparece en el listado con su estado

#### Scenario: Datos incompletos o inválidos

- **GIVEN** un formulario de alta con un campo obligatorio vacío o inválido
- **WHEN** se intenta enviar
- **THEN** se muestran los errores de los campos y no se llama a la API

#### Scenario: Conflicto de identidad

- **GIVEN** un usuario que ya existe para la empresa
- **WHEN** se envía el formulario de alta con el mismo identificador
- **THEN** se muestra un mensaje de conflicto y no se duplica el usuario

### Requirement: Activar y desactivar usuarios

La administración MUST permitir activar y desactivar un usuario y MUST reflejar el nuevo estado en el listado tras la operación.

#### Scenario: Desactivación

- **GIVEN** un usuario activo
- **WHEN** una persona autenticada lo desactiva
- **THEN** el usuario queda inactivo y el listado lo refleja

#### Scenario: Activación

- **GIVEN** un usuario inactivo
- **WHEN** una persona autenticada lo activa
- **THEN** el usuario queda activo y el listado lo refleja

### Requirement: Asignación y retiro de roles

La administración MUST permitir asignar y retirar los roles de un usuario y MUST NOT permitir asignar un rol inexistente o no definido para la empresa.

#### Scenario: Asignar rol

- **GIVEN** un usuario y un rol definido en la empresa
- **WHEN** una persona autenticada lo asigna
- **THEN** la asignación se guarda y el listado muestra el rol del usuario

#### Scenario: Retirar rol

- **GIVEN** un usuario con un rol asignado
- **WHEN** una persona autenticada lo retira
- **THEN** el rol deja de estar asignado y el listado lo refleja

### Requirement: Gestión de roles

La administración MUST permitir crear y editar roles de la empresa y MUST NOT permitir eliminar un rol que siga asignado a usuarios sin advertirlo.

#### Scenario: Crear rol

- **GIVEN** un nombre de rol válido y sus permisos
- **WHEN** se envía el formulario de rol
- **THEN** el rol se crea y queda disponible para asignación

#### Scenario: Editar rol

- **GIVEN** un rol existente
- **WHEN** se modifican su nombre o sus permisos y se guarda
- **THEN** los cambios se guardan y se reflejan en el rol

#### Scenario: Rol en uso

- **GIVEN** un rol asignado a uno o más usuarios
- **WHEN** se intenta eliminar el rol
- **THEN** se advierte de las asignaciones existentes y no se elimina sin confirmación

### Requirement: Permisos por módulo habilitado

Los roles MUST definirse sobre permisos que pertenecen a módulos habilitados de la empresa y la administración MUST NOT ofrecer permisos de módulos no habilitados.

#### Scenario: Permisos de módulo habilitado

- **GIVEN** una empresa con el módulo `inventory` habilitado
- **WHEN** se editan los permisos de un rol
- **THEN** se ofrecen los permisos de inventario para seleccionar

#### Scenario: Permisos de módulo no habilitado

- **GIVEN** una empresa sin el módulo `billing` habilitado
- **WHEN** se editan los permisos de un rol
- **THEN** no se ofrecen permisos de facturación

#### Scenario: Módulo deshabilitado con permisos asignados

- **GIVEN** un rol con permisos de un módulo que luego se deshabilita
- **WHEN** se abre la edición del rol
- **THEN** los permisos del módulo no habilitado no se ofrecen y no se conceden

### Requirement: Patrón BFF sin exposición de credenciales

La administración MUST resolver todas las operaciones de identidad desde el servidor y MUST NOT exponer tokens, credenciales ni la URL interna de la API en el HTML, el JavaScript o variables `PUBLIC_`.

#### Scenario: El navegador no recibe tokens

- **GIVEN** una persona autenticada en la administración de usuarios o roles
- **WHEN** se inspecciona el HTML y el JavaScript entregados al navegador
- **THEN** no aparece ningún token de acceso, credencial ni la URL interna de la API

### Requirement: Estados de la interfaz y fallo de la API

La administración MUST distinguir los estados de carga, vacío y error y MUST NOT mostrar datos cuando la API de identidad falla.

#### Scenario: API no disponible

- **GIVEN** que la API de identidad no responde
- **WHEN** se abre la administración de usuarios o roles
- **THEN** se muestra un mensaje temporal neutro y ninguna fila ni dato de identidad

#### Scenario: Operación rechazada

- **GIVEN** una operación de identidad rechazada por el servidor
- **WHEN** se envía el formulario correspondiente
- **THEN** se muestra un error legible y no se aplica ningún cambio a los datos

### Requirement: Accesibilidad de la administración

La administración MUST usar HTML semántico, foco visible y soporte para movimiento reducido, y MUST anunciar los errores de forma accesible.

#### Scenario: Navegación por teclado

- **GIVEN** la administración de usuarios o roles abierta
- **WHEN** una persona navega con Tab
- **THEN** cada control es alcanzable con foco visible y en orden lógico

#### Scenario: Error anunciado

- **GIVEN** un envío de formulario con errores
- **WHEN** se renderiza la respuesta
- **THEN** los mensajes de error se anuncian a las tecnologías de asistencia
