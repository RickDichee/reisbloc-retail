/**
 * 🛡️ GUARDIÁN DE ROLES (Role Based Access Control - RBAC)
 * Define qué puede hacer cada quién en la interfaz.
 * 
 * Sincronizado con: MEMENTO_RETAIL_STRATEGY.sql
 */

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'vendedor' | 'almacen' | 'mostrador';

// Definición centralizada de permisos
export const PERMISSIONS = {
  // 👑 SOLO ADMIN (Dueño)
  canManageUsers: ['admin'],           // Crear/Borrar Staff
  canManageDevices: ['admin'],         // Aprobar iPads/Celulares
  canConfigureGlobal: ['admin'],       // Configuración de la cuenta/Billing

  // 👔 MANAGER (Gerente)
  canManageProducts: ['admin', 'manager'], // Editar precios/stock
  canViewAnalytics: ['admin', 'manager', 'supervisor'],  // Ver gráficas de ventas
  canViewBilling: ['admin', 'manager'],    // Ver facturas
  canCloseDay: ['admin', 'manager'],       // Hacer corte de caja (Z)

  // 🧢 STAFF (Operativo)
  canOperatePOS: ['admin', 'manager', 'supervisor', 'vendedor'], // Vender
  canVoidOrders: ['admin', 'manager', 'supervisor'],           // Cancelar órdenes
} as const;

export type PermissionAction = keyof typeof PERMISSIONS;

/**
 * Verifica si un rol tiene permiso para una acción específica.
 */
export const hasPermission = (role: UserRole | undefined | string, action: PermissionAction): boolean => {
  if (!role) return false;
  // @ts-expect-error - Dynamic role mapping
  return PERMISSIONS[action]?.includes(role as UserRole) || false;
};