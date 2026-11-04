# Administración de catálogo e inventario

## Why

El backend expone catálogo e inventario, pero no hay forma de operarlos desde la web. Una empresa (por ejemplo la farmacia "Cuidando de Ti") necesita dar de alta productos, sucursales y stock sin llamar a la API a mano.

## What Changes

- Pantalla `/admin/catalogo` (SSR) que se renderiza dentro del shell de administración, lista categorías y productos de la empresa y permite crear categorías y productos.
- Pantalla `/admin/inventario` que se renderiza dentro del shell de administración, lista sucursales, muestra el stock por sucursal y registra movimientos de entrada, salida y ajuste.
- Acceso a la API desde el servidor Astro (patrón BFF) detrás de la sesión de servidor que aporta `empresa-app-foundation`; el navegador nunca recibe tokens ni credenciales, y la empresa se deduce del servidor.
- Estados de carga, error y vacío; HTML semántico, etiquetas de formulario, foco visible y movimiento reducido.
- Documentación del flujo de administración en el README.

### Exclusiones

- No incluye POS/ventas, facturación ni traspasos desde la UI (se pueden añadir después). El inicio de sesión real, la protección de rutas y la deducción de la empresa los aporta `empresa-app-foundation`.
- No modifica los componentes generados de shadcn/ui más allá de composición.

## Capabilities

### New Capabilities

- `catalog-admin`: administración web de catálogo (categorías, productos) e inventario (sucursales, stock, movimientos) de la empresa de la instalación.

### Modified Capabilities

<!-- Ninguna: no cambia los requisitos de `empresa-web`. -->

## Impact

- Nuevas páginas en `src/pages/admin/`, componentes de formulario y un cliente de API de servidor en `src/lib/admin/`.
- Reutiliza el shell, la sesión de servidor y el cliente autenticado de `empresa-app-foundation`, el SSR por dominio y los componentes de `src/components/ui`.
- No añade variables `PUBLIC_` ni credenciales: la operación usa la sesión de servidor y la empresa de la instalación resueltas por el servidor.
- Depende del cambio `../plataforma-core-api` `empresa-catalog-inventory` y su contrato `docs/contracts/empresa-catalog-inventory-v1.md`.
- Reversión: eliminar las rutas `admin` y su cliente; el resto del sitio no se ve afectado.
