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
  // 🛡️ SEGURIDAD MULTI-TENANT ROBUSTA:
  // Si existe orgId válido, filtrar estrictamente por esa organización.
  if (orgId && orgId.trim() !== '') {
    return query.eq('organization_id', orgId)
  }
  // Si NO hay orgId asignado al usuario, FORZAR un filtro nulo para DEVOLVER 0 REGISTROS.
  // JAMÁS devolver la tabla completa sin filtrar.
  return query.eq('organization_id', '00000000-0000-0000-0000-000000000000')
}