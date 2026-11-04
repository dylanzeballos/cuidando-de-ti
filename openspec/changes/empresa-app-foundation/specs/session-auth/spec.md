## Purpose

Permite que una persona inicie y cierre sesión y que la administración resuelva la empresa desde una sesión de servidor segura, sin exponer credenciales ni tokens al navegador y sin confiar en datos de empresa elegidos por el cliente.

## ADDED Requirements

### Requirement: Inicio de sesión

La aplicación MUST ofrecer un formulario de inicio de sesión que envíe las credenciales al servidor, MUST validar los campos antes de llamar a la API y MUST mostrar un error legible cuando las credenciales son rechazadas.

#### Scenario: Credenciales válidas

- **GIVEN** un usuario con credenciales válidas
- **WHEN** envía el formulario de inicio de sesión
- **THEN** se crea una sesión y se le redirige a la administración

#### Scenario: Credenciales inválidas

- **GIVEN** un usuario con contraseña incorrecta
- **WHEN** envía el formulario de inicio de sesión
- **THEN** se muestra un mensaje de error legible y no se crea ninguna sesión

#### Scenario: Campos incompletos

- **GIVEN** un formulario con un campo obligatorio vacío
- **WHEN** se intenta enviar
- **THEN** se muestra el error del campo y no se llama a la API

### Requirement: Sesión de servidor y cookie segura

La aplicación MUST mantener la identidad y los tokens de sesión en el servidor y MUST entregar al navegador solo una cookie de sesión segura (`HttpOnly`, `SameSite`), sin exponer tokens ni credenciales en HTML, JavaScript ni variables `PUBLIC_`.

#### Scenario: El token no llega al cliente

- **GIVEN** una sesión iniciada
- **WHEN** se inspecciona el HTML y el JavaScript entregados al navegador
- **THEN** no aparece ningún token de acceso ni credencial

#### Scenario: Cookie no accesible por scripts

- **GIVEN** una respuesta tras iniciar sesión
- **WHEN** se inspecciona la cookie de sesión
- **THEN** está marcada `HttpOnly` y `SameSite`

### Requirement: Cierre de sesión

La aplicación MUST permitir cerrar la sesión y MUST invalidar la sesión de servidor antes de redirigir al inicio de sesión.

#### Scenario: Cierre de sesión

- **GIVEN** una persona con sesión iniciada
- **WHEN** solicita cerrar sesión
- **THEN** la sesión de servidor se invalida y se redirige al inicio de sesión

### Requirement: Protección de rutas de administración

La aplicación MUST exigir una sesión válida para acceder a las rutas de administración y MUST deducir la empresa del lado del servidor, nunca desde un valor elegido por el cliente.

#### Scenario: Acceso sin sesión

- **GIVEN** una persona sin sesión
- **WHEN** solicita una ruta de administración
- **THEN** se le redirige al inicio de sesión y no se muestran datos de administración

#### Scenario: Empresa de la instalación

- **GIVEN** una persona autenticada en la instalación de una sola empresa
- **WHEN** opera en la administración
- **THEN** las operaciones se realizan contra la empresa de esa instalación y no contra una enviada por el cliente

### Requirement: Fallo de la API de autenticación

La aplicación MUST distinguir credenciales rechazadas de un fallo temporal de la API y MUST NOT crear una sesión ante un error del servidor.

#### Scenario: API no disponible

- **GIVEN** que la API de autenticación no responde
- **WHEN** se intenta iniciar sesión
- **THEN** se muestra un mensaje temporal neutro y no se crea ninguna sesión
