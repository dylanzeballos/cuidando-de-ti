import { describe, expect, it } from 'vitest';
import { createIdentityFixtureClient, fixtureEnabled } from '@/lib/admin/identity-fixture';

describe('createIdentityFixtureClient', () => {
  it('lista usuarios con su forma del contrato y cabecera de empresa ausente', async () => {
    const client = createIdentityFixtureClient();

    const result = await client.listUsers();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0]?.roles).toBeDefined();
    }
  });

  it('expone permisos agrupados por módulo, con módulos habilitados y no habilitados', async () => {
    const client = createIdentityFixtureClient();

    const result = await client.listPermissions();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const codes = result.data.map((group) => group.moduleCode);
      expect(codes).toContain('identity');
      expect(result.data.find((group) => group.moduleCode === 'billing')?.enabled).toBe(false);
    }
  });

  it('crea un usuario y lo devuelve en el listado posterior', async () => {
    const client = createIdentityFixtureClient();

    const created = await client.createUser({
      email: 'caro@acme.test',
      password: 'secreta123',
      displayName: 'Caro',
      active: true,
    });
    expect(created.status).toBe('ok');

    const listed = await client.listUsers();
    expect(listed.status).toBe('ok');
    if (listed.status === 'ok') {
      expect(listed.data.items.some((user) => user.email === 'caro@acme.test')).toBe(true);
    }
  });

  it('rechaza un correo duplicado con conflict', async () => {
    const client = createIdentityFixtureClient();

    const result = await client.createUser({
      email: 'ana@acme.test',
      password: 'secreta123',
      displayName: 'Ana',
    });

    expect(result.status).toBe('conflict');
  });

  it('cambia el estado del usuario y lo refleja', async () => {
    const client = createIdentityFixtureClient();

    const result = await client.setUserStatus('user-beto', true);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.active).toBe(true);
  });

  it('no elimina un rol asignado a usuarios (conflict) y sí uno libre', async () => {
    const client = createIdentityFixtureClient();

    const inUse = await client.deleteRole('role-vendedor');
    expect(inUse.status).toBe('conflict');

    const free = await client.deleteRole('role-almacen');
    expect(free.status).toBe('ok');
  });

  it('rechaza asignar un rol inexistente', async () => {
    const client = createIdentityFixtureClient();

    const result = await client.setUserRoles('user-beto', ['role-inexistente']);

    expect(result.status).toBe('notFound');
  });
});

describe('fixtureEnabled', () => {
  it('solo se activa en desarrollo con la bandera explícita', () => {
    expect(fixtureEnabled(true, 'true')).toBe(true);
    expect(fixtureEnabled(false, 'true')).toBe(false);
    expect(fixtureEnabled(true, undefined)).toBe(false);
    expect(fixtureEnabled(true, 'false')).toBe(false);
  });
});
