// Tipos principales del sistema
export type UserRole = 'admin' | 'capitan' | 'mesero' | 'cocina' | 'bar' | 'supervisor';

export interface User {
  id: string;
  username: string;
  pin: string;
  role: UserRole;
  email?: string;
  active: boolean;
  createdAt: Date;
  devices?: string[]; // IDs de dispositivos autorizados
  organizationId?: string; // ID de la organización (Multi-Tenant)
  avatar_url?: string;
  businessName?: string;
}

export interface Device {
  id: string;
  userId: string;
  macAddress: string;
  deviceName: string;
  network: 'wifi' | 'mobile';
  os: string;
  browser: string;
  deviceType?: string; // laptop, mobile, tablet, etc.
  fingerprint?: string; // identificador adicional
  registeredAt: Date;
  lastAccess: Date;
  isApproved: boolean;
  isRejected?: boolean; // Added to align with DeviceApprovalPanel.tsx logic
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  hasInventory: boolean;
  currentStock?: number;
  minimumStock?: number;
  active: boolean;
  image?: string;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  addedAt: Date;
  addedBy: string;
  canBeDeleted: boolean; // false después de 5 minutos
  deletedAt?: Date;
  deletedBy?: string;
  deleteReason?: string;
  notes?: string;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'open' | 'sent' | 'ready' | 'served' | 'completed' | 'cancelled';
  isCourtesy?: boolean; // Mesa cortesía sin costo
  authorizedBy?: string; // Admin que autorizó mesa cortesía
  createdAt: Date;
  sentToKitchenAt?: Date;
  createdBy: string;
  notes?: string;
  closedAt?: Date;
  closedBy?: string;
  lastEditedAt?: Date;
  lastEditedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface Sale {
  id: string;
  orderIds: string[];
  tableNumber: number;
  items: OrderItem[];
  subtotal: number;
  discounts: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'digital' | 'clip' | 'mixed';
  currency?: 'MXN' | 'USD'; // Default: MXN
  cashAmount?: number; // MXN
  usdAmount?: number; // USD cash
  digitalAmount?: number; // MXN
  clipTransactionId?: string;
  tip?: number; // Total tip
  tipCurrency?: 'MXN' | 'USD'; // Tip currency
  tipSource: 'cash' | 'digital' | 'none';
  paymentBreakdown?: { // Para pagos mixtos por persona
    personNumber?: number;
    method: 'cash' | 'digital' | 'clip';
    currency: 'MXN' | 'USD';
    amount: number;
    tip?: number;
  }[];
  saleBy: string;
  createdAt: Date;
  printedAt?: Date;
}

export interface DailyClose {
  id: string;
  date: Date;
  closedBy: string;
  closedAt: Date;
  sales: Sale[];
  totalSales: number;
  totalCash: number;
  totalDigital: number;
  totalCard?: number;
  totalTips: number;
  tipsDistribution: TipDistribution[];
  ordersCount?: number;
  salesCount?: number;
  employeeMetrics?: EmployeeMetrics[];
  paymentMethods?: Record<string, number>;
  notes?: string;
  status?: string;
  adjustments: Adjustment[];
  discrepancy?: number;
}

export interface TipDistribution {
  userId: string;
  userName: string;
  tipsGenerated: number;
  salesCount: number;
  sharePercentage: number;
  amountToPay: number;
}

export interface Adjustment {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  createdBy: string;
  createdAt: Date;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  deviceId?: string;
  timestamp: Date;
}

export interface EmployeeMetrics {
  userId: string;
  userName: string;
  role: UserRole;
  totalSales: number;
  salesCount: number;
  averageTicket: number;
  tipsGenerated: number;
  averageTip: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ClipPayment {
  id: string;
  saleId: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  tip?: number;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface AuthContext {
  user: User | null;
  device: Device | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  registerDevice: (device: Device) => Promise<void>;
}
