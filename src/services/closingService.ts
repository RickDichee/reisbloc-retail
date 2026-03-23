// Servicio para gestión de propinas y cierre de caja
import { Sale, DailyClose, TipDistribution, User } from '@/types';
import auditService from './auditService';

class ClosingService {
  /**
   * Calcula la distribución de propinas de forma equitativa
   */
  calculateTipDistribution(
    sales: Sale[],
    users: User[]
  ): TipDistribution[] {
    // Obtener propinas totales del día
    const totalTips = sales.reduce((sum, sale) => sum + (sale.tip || 0), 0);

    // Agrupar ventas por usuario
    const salesByUser: { [userId: string]: Sale[] } = {};
    const userMap: { [userId: string]: User } = {};

    users.forEach(user => {
      userMap[user.id] = user;
      salesByUser[user.id] = [];
    });

    sales.forEach(sale => {
      if (salesByUser[sale.saleBy]) {
        salesByUser[sale.saleBy].push(sale);
      }
    });

    // Calcular propinas por usuario
    const distributions: TipDistribution[] = [];

    Object.entries(salesByUser).forEach(([userId, userSales]) => {
      if (!userMap[userId]) return;

      const userTipsGenerated = userSales.reduce((sum, sale) => sum + (sale.tip || 0), 0);
      const userSalesCount = userSales.length;

      // Todos participan en la distribución equitativa si generaron ventas
      distributions.push({
        userId,
        userName: userMap[userId].username,
        tipsGenerated: userTipsGenerated,
        salesCount: userSalesCount,
        sharePercentage: userSalesCount > 0 ? (userSalesCount / sales.length) * 100 : 0,
        amountToPay: 0, // Se calculará después
      });
    });

    // Distribución equitativa entre todos los que trabajaron
    const workingUsers = distributions.filter(d => d.salesCount > 0);
    if (workingUsers.length > 0 && totalTips > 0) {
      const tipPerPerson = totalTips / workingUsers.length;
      workingUsers.forEach(dist => {
        dist.amountToPay = tipPerPerson;
      });
    }

    return distributions;
  }

  /**
   * Calcula ajuste para pagos digitales
   * Si alguien pagó digital, se descuenta del efectivo
   */
  calculateDigitalAdjustment(
    sales: Sale[],
    clipPayments: any[]
  ): { adjustment: number; details: string } {
    const totalNoCashPayments = sales.reduce((sum, sale) => {
      if (['transferencia', 'tarjeta', 'digital', 'clip'].includes(sale.paymentMethod)) {
        return sum + sale.total;
      }
      return sum;
    }, 0);
    void totalNoCashPayments;

    const totalNoCashTips = clipPayments.reduce((sum, payment) => sum + (payment.tip || 0), 0);

    return {
      adjustment: totalNoCashTips,
      details: `Propinas Tarjeta/Transf: $${totalNoCashTips.toFixed(2)} de ${clipPayments.length} pagos`,
    };
  }

  /**
   * Genera el cierre del día
   */
  async generateDailyClose(
    date: Date,
    sales: Sale[],
    users: User[],
    closedBy: string,
    adjustments: any[] = [],
    deviceId?: string
  ): Promise<DailyClose> {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCash = sales
      .filter(s => s.paymentMethod === 'cash' || s.paymentMethod === 'mixed')
      .reduce((sum, s) => sum + (s.cashAmount || 0), 0);

    const totalDigital = sales
      .filter(s => ['transferencia', 'digital', 'clip'].includes(s.paymentMethod))
      .reduce((sum, s) => sum + s.total, 0);

    const totalTips = sales.reduce((sum, sale) => sum + (sale.tip || 0), 0);

    const tipsDistribution = this.calculateTipDistribution(sales, users);

    const dailyClose: DailyClose = {
      id: `close_${Date.now()}`,
      date,
      closedBy,
      closedAt: new Date(),
      sales,
      totalSales,
      totalCash,
      totalDigital,
      totalTips,
      tipsDistribution,
      adjustments,
    };

    // Registrar en auditoría
    await auditService.logDailyClose(
      closedBy,
      dailyClose.id,
      totalSales,
      totalCash,
      totalDigital,
      deviceId
    );

    return dailyClose;
  }

  /**
   * Calcula las métricas individuales de cada empleado
   */
  calculateEmployeeMetrics(
    sales: Sale[],
    users: User[],
    period: { startDate: Date; endDate: Date }
  ): any[] {
    const metricsMap: { [userId: string]: any } = {};

    users.forEach(user => {
      metricsMap[user.id] = {
        userId: user.id,
        userName: user.username,
        role: user.role,
        totalSales: 0,
        salesCount: 0,
        averageTicket: 0,
        tipsGenerated: 0,
        averageTip: 0,
        period,
      };
    });

    // Calcular métricas
    sales.forEach(sale => {
      if (metricsMap[sale.saleBy]) {
        metricsMap[sale.saleBy].totalSales += sale.total;
        metricsMap[sale.saleBy].salesCount += 1;
        metricsMap[sale.saleBy].tipsGenerated += sale.tip || 0;
      }
    });

    // Calcular promedios
    Object.values(metricsMap).forEach((metrics: any) => {
      if (metrics.salesCount > 0) {
        metrics.averageTicket = metrics.totalSales / metrics.salesCount;
        metrics.averageTip = metrics.tipsGenerated / metrics.salesCount;
      }
    });

    return Object.values(metricsMap);
  }

  /**
   * Genera reporte transparente de propinas con desglose
   */
  generateTipReport(
    tipsDistribution: TipDistribution[],
    sales: Sale[]
  ): any {
    const report = {
      period: new Date().toLocaleDateString('es-MX'),
      totalTips: tipsDistribution.reduce((sum, d) => sum + d.amountToPay, 0),
      distributeCount: tipsDistribution.filter(d => d.amountToPay > 0).length,
      distribution: tipsDistribution
        .filter(d => d.amountToPay > 0)
        .map(d => ({
          ...d,
          amountToPay: parseFloat(d.amountToPay.toFixed(2)),
          tipsGenerated: parseFloat(d.tipsGenerated.toFixed(2)),
        })),
      details: {
        totalSales: sales.length,
        tipsFromCash: sales
          .filter(s => s.tipSource === 'cash')
          .reduce((sum, s) => sum + (s.tip || 0), 0),
        tipsFromNoCash: sales
          .filter(s => s.tipSource !== 'cash')
          .reduce((sum, s) => sum + (s.tip || 0), 0),
      },
    };

    return report;
  }

  /**
   * Exporta cierre del día a formato imprimible
   */
  formatClosingForPrint(dailyClose: DailyClose): string {
    const date = new Date(dailyClose.date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let output = `
╔════════════════════════════════════╗
║   CIERRE DE CAJA DEL DÍA          ║
╚════════════════════════════════════╝

Fecha: ${date}
Cerrado por: ${dailyClose.closedBy}
Hora: ${new Date(dailyClose.closedAt).toLocaleTimeString('es-MX')}

────────────────────────────────────
RESUMEN DE VENTAS
────────────────────────────────────
Total Ventas:         $${dailyClose.totalSales.toFixed(2)}
├─ En Efectivo:       $${dailyClose.totalCash.toFixed(2)}
├─ Tarjeta/Transf:    $${(dailyClose.totalDigital || 0).toFixed(2)}
└─ Propinas Totales:  $${dailyClose.totalTips.toFixed(2)}

────────────────────────────────────
DISTRIBUCIÓN DE PROPINAS
────────────────────────────────────
    `;

    dailyClose.tipsDistribution.forEach(dist => {
      if (dist.amountToPay > 0) {
        output += `
${dist.userName}
├─ Ventas Realizadas:    ${dist.salesCount}
├─ Propinas Generadas:   $${dist.tipsGenerated.toFixed(2)}
├─ Porcentaje:           ${dist.sharePercentage.toFixed(1)}%
└─ A Recibir:            $${dist.amountToPay.toFixed(2)}
        `;
      }
    });

    output += `
────────────────────────────────────
AJUSTES
────────────────────────────────────
    `;

    dailyClose.adjustments.forEach(adj => {
      const sign = adj.type === 'income' ? '+' : '-';
      output += `\n${adj.description}: ${sign}$${adj.amount.toFixed(2)}`;
    });

    output += `

════════════════════════════════════
    `;

    return output;
  }
}

export default new ClosingService();
