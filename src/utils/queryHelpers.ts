/**
 * Helper para aplicar filtros de organización de manera segura.
 * Evita el error 400 (invalid input syntax for type uuid) cuando orgId es null/undefined/''.
 * Implementa el patrón: if (!orgId) fetchAll else fetchByOrg
 * 
 * @param query - La consulta de Supabase en construcción
 * @param orgId - El ID de la organización (puede ser null/undefined)
 * @returns La consulta modificada
 */
export const withOrg = (query: any, orgId?: string | null) => {
  // Validación robusta: Evitar strings vacíos que causan error 22P02 en PostgREST
  if (orgId && orgId.trim() !== '') {
    return query.eq('organization_id', orgId)
  }
  // Si no hay orgId, devolvemos el query sin filtrar.
  // RLS se encargará de mostrar solo lo público/demo o nada, pero sin dar error 400.
  return query
}