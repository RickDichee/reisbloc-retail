import { useAppStore } from '@/store/appStore'
import { UserRole } from '@/types/index'

/**
 * Hook para gestionar permisos basados en roles
 */
export function usePermissions() {
  const { currentUser } = useAppStore()
  const role = currentUser?.role

  // Permisos administrativos completos
  const canManageUsers = role === 'admin' || role === 'supervisor'
  const canManageInventory = role === 'admin' || role === 'supervisor'
  const canManageDevices = role === 'admin' || role === 'supervisor'
  const canViewLogs = role === 'admin' || role === 'supervisor'
  const canExportReports = role === 'admin' || role === 'supervisor'
  
  // Permisos operativos
  const canCreateSales = ['admin', 'capitan', 'mesero', 'bar'].includes(role || '')
  const canModifyOrders = ['admin', 'capitan', 'mesero'].includes(role || '')
  const canDeleteProducts = role === 'admin'
  const canAccessKitchen = ['admin', 'cocina'].includes(role || '')
  const canAccessBar = ['admin', 'bar'].includes(role || '')
  const canManageTables = ['admin', 'capitan', 'supervisor'].includes(role || '')
  // Solo admin/capitan/supervisor acceden a monitor - mesero usa OrdersToServe
  const canAccessTableMonitor = canManageTables
  
  // Permisos de reportes
  const canViewReports = ['admin', 'supervisor'].includes(role || '')
  const canViewSalesReport = ['admin', 'supervisor'].includes(role || '')
  const canViewInventoryReport = ['admin', 'supervisor'].includes(role || '')
  const canViewEmployeeMetrics = role === 'admin'
  
  // Permisos financieros
  const canCloseCashRegister = role === 'admin'
  const canCloseRegister = role === 'admin'
  const canViewFinancialData = ['admin', 'supervisor'].includes(role || '')
  const canApplyDiscounts = ['admin', 'capitan'].includes(role || '')
  
  // Helper: verificar si tiene al menos uno de los roles
  const hasAnyRole = (roles: UserRole[]) => {
    return roles.includes(role as UserRole)
  }
  
  // Helper: verificar si es rol de solo lectura
  const isReadOnly = role === 'supervisor'

  return {
    // Permisos administrativos
    canManageUsers,
    canManageInventory,
    canManageDevices,
    canViewLogs,
    canExportReports,
    
    // Permisos operativos
    canCreateSales,
    canModifyOrders,
    canDeleteProducts,
    canAccessKitchen,
    canAccessBar,
    canManageTables,
    canAccessTableMonitor,
    
    // Permisos de reportes
    canViewReports,
    canViewSalesReport,
    canViewInventoryReport,
    canViewEmployeeMetrics,
    
    // Permisos financieros
    canCloseCashRegister,
    canCloseRegister,
    canViewFinancialData,
    canApplyDiscounts,
    
    // Helpers
    hasAnyRole,
    isReadOnly,
    currentRole: role,
    isAdmin: role === 'admin',
  }
}
