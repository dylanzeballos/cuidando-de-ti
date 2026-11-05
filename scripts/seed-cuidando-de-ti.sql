-- Datos de desarrollo para conectar este frontend con plataforma-core-api.
-- Ejecutar una sola vez sobre la base local `plataforma` después de
-- `plataforma-core-api/scripts/seed-dev.sql`:
--   psql "$env:DB_URL" -U plataforma -f scripts/seed-cuidando-de-ti.sql
--
-- La API exige exactamente una empresa por instalación, por eso se rebautiza la
-- empresa sembrada por el backend en lugar de crear una segunda. La cuenta
-- administradora conserva la contraseña de desarrollo `admin1234`.

SET client_encoding TO 'UTF8';

UPDATE empresa
SET slug = 'cuidando-de-ti',
    legal_name = 'Cuidando de Ti'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE empresa_site
SET site_name = 'Cuidando de Ti',
    description = 'Farmacia: catálogo, inventario, ventas, caja, costos e identidad.',
    primary_color = '#0f766e',
    background_color = '#ffffff',
    foreground_color = '#0f1f1c'
WHERE empresa_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO empresa_domain (id, empresa_id, domain)
VALUES ('11111111-1111-1111-1111-1111111111a2',
        '11111111-1111-1111-1111-111111111111',
        'cuidando-de-ti.test')
ON CONFLICT (domain) DO NOTHING;

UPDATE user_account
SET email = 'admin@cuidando-de-ti.test',
    display_name = 'Administrador Farmacia'
WHERE email = 'admin@acme.test';
