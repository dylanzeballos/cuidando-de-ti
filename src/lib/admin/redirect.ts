/** Redirección 303 reutilizable para los flujos POST-redirect-GET del panel. */
export function redirectWith(path: string, params: Record<string, string>): Response {
  const search = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 303,
    headers: { location: `${path}${search ? `?${search}` : ''}` },
  });
}
