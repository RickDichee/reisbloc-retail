import { useAppStore } from '@/store/appStore'
import { UserRole } from '@/config/roles'

/**
 * Hook para gestionar permisos basados en roles
 * Sistema Retail Multitenant - Reisbloc Store
 */
export function usePermissions() {
  const { currentUser } = useAppStore()
  const role = currentUser?.role as UserRole | undefined

  // 👑 ADMIN - Acceso total
  const isAdmin = role === 'admin'
  const canManageUsers = isAdmin
  const canManageDevices = isAdmin
  const canDeleteProducts = isAdmin
  const canViewEmployeeMetrics = isAdmin
  const canCloseCashRegister = isAdmin
  const canManageInventory = isAdmin
  
  // 👔 MANAGER - Gestión operativa
  const isManager = role === 'manager'
  const canManageProducts = isAdmin || isManager
  const canViewBilling = isAdmin || isManager
  const canCloseDay = isAdmin || isManager
  const canApplyDiscounts = isAdmin || isManager
  const canVoidOrders = isAdmin || isManager
  const canExportReports = isAdmin || isManager || role === 'supervisor'
  
  // 👁️ SUPERVISOR - Solo lectura (ver todo, modificar nada)
  const isSupervisor = role === 'supervisor'
  const isReadOnly = isSupervisor
  
  // Permisos operativos
  const canCreateSales = ['admin', 'manager', 'supervisor', 'cashier', 'employee'].includes(role || '')
  const canModifyOrders = ['admin', 'manager', 'cashier'].includes(role || '')
  const canAccessKitchen = false // Legacy - no aplica en retail
  const canAccessBar = false // Legacy - no aplica en retail
  const canManageTables = false // Legacy - no aplica en retail
  const canAccessTableMonitor = false // Legacy
  
  // Permisos de reportes
  const canViewReports = ['admin', 'manager', 'supervisor'].includes(role || '')
  const canViewSalesReport = canViewReports
  const canViewInventoryReport = canViewReports
  const canViewFinancialData = canViewReports
  const canViewLogs = isAdmin || isSupervisor

  // Helper: verificar si tiene al menos uno de los roles
  const hasAnyRole = (roles: UserRole[]) => {
    return roles.includes(role as UserRole)
  }

  return {
    // Roles
    currentRole: role,
    isAdmin,
    isManager,
    isSupervisor,
    isReadOnly,
    
    // Permisos administrativos
    canManageUsers,
    canManageDevices,
    canDeleteProducts,
    canViewEmployeeMetrics,
    canCloseCashRegister,
    canExportReports,
    canManageProducts,
    canManageInventory,
    canViewBilling,
    canCloseDay,
    canApplyDiscounts,
    canVoidOrders,
    canViewLogs,

    // Permisos operativos
    canCreateSales,
    canModifyOrders,
    canAccessKitchen,
    canAccessBar,
    canManageTables,
    canAccessTableMonitor,

    // Permisos de reportes
    canViewReports,
    canViewSalesReport,
    canViewInventoryReport,
    canViewFinancialData,

    // Helpers
    hasAnyRole,
  }
}