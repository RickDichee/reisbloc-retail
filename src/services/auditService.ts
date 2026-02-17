// Servicio para gestión de auditoría
import { AuditLog } from '@types/index';
import databaseService from './databaseService'
import logger from '@/utils/logger'

class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    deviceId?: string
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id' | 'created_at'> = {
        userId: userId || '',
        action,
        entityType,
        entityId: entityId || '',
        oldValue,
        newValue,
        ipAddress: await this.getClientIP(),
        deviceId,
      };

      // Guardar en Supabase via databaseService
      await databaseService.createAuditLog(auditLog as any);

      // Log en consola para desarrollo
      logger.info('audit', `Audit log: ${action} on ${entityType}/${entityId}`)
    } catch (error) {
      logger.error('audit', 'Error logging audit', error as any);
    }
  }

  /**
   * Registra eliminación de producto con restricción de tiempo
   */
  async logProductDeletion(
    userId: string,
    productId: string,
    productName: string,
    minutesElapsed: number,
    deviceId?: string,
    reason?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'DELETE_PRODUCT_FROM_ORDER',
      'ORDER_ITEM',
      productId,
      { name: productName, minutesElapsed },
      { deletedAt: new Date(), reason },
      deviceId
    );
  }

  /**
   * Registra cambios de inventario
   */
  async logInventoryChange(
    userId: string,
    productId: string,
    productName: string,
    quantityBefore: number,
    quantityAfter: number,
    reason: string,
    deviceId?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'INVENTORY_CHANGE',
      'PRODUCT',
      productId,
      { quantity: quantityBefore, name: productName },
      { quantity: quantityAfter },
      deviceId
    );
  }

  /**
   * Registra modificación de usuario
   */
  async logUserModification(
    userId: string,
    modifiedUserId: string,
    changes: any,
    deviceId?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'USER_MODIFIED',
      'USER',
      modifiedUserId,
      undefined,
      changes,
      deviceId
    );
  }

  /**
   * Registra cierre de caja
   */
  async logDailyClose(
    userId: string,
    closeId: string,
    totalSales: number,
    totalCash: number,
    totalDigital: number,
    deviceId?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'DAILY_CLOSE',
      'DAILY_CLOSE',
      closeId,
      undefined,
      {
        totalSales,
        totalCash,
        totalDigital,
        timestamp: new Date(),
      },
      deviceId
    );
  }

  /**
   * Registra ajuste de caja
   */
  async logCashAdjustment(
    userId: string,
    amount: number,
    reason: string,
    type: 'income' | 'expense',
    deviceId?: string
  ): Promise<void> {
    await this.logAction(
      userId,
      'CASH_ADJUSTMENT',
      'ADJUSTMENT',
      `adj_${Date.now()}`,
      undefined,
      { amount, reason, type },
      deviceId
    );
  }

  /**
   * Obtiene IP del cliente (se implementará mejor en el servidor)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  }

  /**
   * Guardar audit log en Supabase
   */
  private async saveAuditLog(log: AuditLog): Promise<void> {
    // Se hace en logAction via databaseService.createAuditLog
  }

  /**
   * Obtiene logs de auditoría con filtros
   */
  async getLogs(
    filters: {
      userId?: string;
      entityType?: string;
      action?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    try {
      // Obtener todos los logs (limit es opcional, default 100)
      let logs = await databaseService.getAuditLogs?.(filters.limit || 100) || []

      // Aplicar filtros localmente
      if (filters.userId) {
        logs = logs.filter((log: any) => log.user_id === filters.userId)
      }
      if (filters.entityType) {
        logs = logs.filter((log: any) => log.table_name === filters.entityType)
      }
      if (filters.action) {
        logs = logs.filter((log: any) => log.action === filters.action)
      }
      if (filters.dateFrom) {
        logs = logs.filter((log: any) => new Date(log.created_at) >= filters.dateFrom!)
      }
      if (filters.dateTo) {
        logs = logs.filter((log: any) => new Date(log.created_at) <= filters.dateTo!)
      }

      // Mapear campos de Supabase a formato local
      return logs.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        entityType: log.table_name,
        entityId: log.record_id,
        oldValue: log.changes?.old,
        newValue: log.changes?.new,
        ipAddress: log.ip_address,
        deviceId: undefined,
        timestamp: new Date(log.created_at),
      }))
    } catch (error) {
      logger.error('audit', 'Error getting audit logs', error as any)
      return []
    }
  }

  /**
   * Genera reporte de auditoría
   */
  async generateAuditReport(
    dateFrom: Date,
    dateTo: Date,
    userId?: string
  ): Promise<any> {
    const logs = await this.getLogs({
      userId,
      dateFrom,
      dateTo,
      limit: 1000,
    });

    return {
      period: { from: dateFrom, to: dateTo },
      totalActions: logs.length,
      byAction: this.groupBy(logs, 'action'),
      byUser: this.groupBy(logs, 'userId'),
      byEntityType: this.groupBy(logs, 'entityType'),
      logs,
    };
  }

  /**
   * Helper para agrupar arrays
   */
  private groupBy(arr: any[], key: string): any {
    return arr.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }
}

export default new AuditService();
