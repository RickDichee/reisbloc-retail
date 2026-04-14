/**
 * 🛡️ GUARDIÁN DE ROLES (Role Based Access Control - RBAC)
 * Define qué puede hacer cada quién en la interfaz.
 * 
 * Sistema Retail Multitenant - Reisbloc Store
 */

export type UserRole = 'admin' | 'manager' | 'supervisor' | 'cashier' | 'employee';

// Definición centralizada de permisos
export const PERMISSIONS = {
  // 👑 SOLO ADMIN (Dueño)
  canManageUsers: ['admin'],           // Crear/Borrar Staff
  canManageDevices: ['admin'],         // Aprobar dispositivos
  canConfigureGlobal: ['admin'],       // Configuración de la cuenta/Billing
  canDeleteProducts: ['admin'],        // Eliminar productos
  canViewEmployeeMetrics: ['admin'],   // Métricas de empleados
  canCloseCashRegister: ['admin'],     // Corte de caja

  // 👔 MANAGER (Gerente)
  canManageProducts: ['admin', 'manager'], // Editar precios/stock
  canViewAnalytics: ['admin', 'manager', 'supervisor'],  // Ver gráficas
  canViewBilling: ['admin', 'manager'],    // Ver facturas
  canCloseDay: ['admin', 'manager'],       // Hacer corte de caja (Z)
  canApplyDiscounts: ['admin', 'manager'], // Aplicar descuentos
  canVoidOrders: ['admin', 'manager'],    // Cancelar órdenes
  canExportReports: ['admin', 'manager', 'supervisor'],

  // 👁️ SUPERVISOR (Solo lectura)
  canViewAll: ['admin', 'manager', 'supervisor'], // Ver todo sin modificar
  canOperatePOS: ['admin', 'manager', 'supervisor', 'cashier', 'employee'],
  
  // 💰 CASHIER (Cajero)
  canCreateSales: ['admin', 'manager', 'supervisor', 'cashier', 'employee'],
  
  // 👷 EMPLOYEE (Empleado)
  canBasicOperation: ['admin', 'manager', 'supervisor', 'cashier', 'employee'],
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