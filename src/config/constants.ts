// Configuración de aplicación Retail SaaS
export const APP_CONFIG = {
  // Roles y permisos
  ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    SUPERVISOR: 'supervisor',
    CASHIER: 'cashier',
    EMPLOYEE: 'employee',
  },

  // Mensajes del sistema
  MESSAGES: {
    DEVICE_NOT_REGISTERED: 'Este dispositivo no está registrado. Por favor, solicita autorización del administrador.',
    DEVICE_NOT_APPROVED: 'Tu dispositivo aún no ha sido aprobado. Espera a que el administrador lo valide.',
    PIN_INVALID: 'PIN incorrecto',
    SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
  },
};

// Configuración de logging
export const LOG_CONFIG = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_REMOTE_LOGS: true,
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
};
