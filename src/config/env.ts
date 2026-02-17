/**
 * Helper para variables obligatorias
 * Proporciona validación estricta para asegurar que la aplicación no corra con configuraciones inseguras.
 */
export const getRequiredEnv = (key: string, context?: string): string => {
    const value = import.meta.env[key];

    // Validar que existe
    if (!value) {
        throw new Error(
            `❌ Missing required environment variable: ${key}${context ? ` (${context})` : ''}`
        );
    }

    // Validar que no sea un placeholder (común en repositorios clonados sin configurar)
    const testValues = ['test_key', 'test_merchant', 'your_', 'example_', 'change_me'];
    if (testValues.some(test => value.toLowerCase().includes(test))) {
        throw new Error(
            `❌ ${key} contains a placeholder value. Set a real ${context || 'credential'}.`
        );
    }

    return value;
};

/**
 * Obtener variable de entorno opcional con valor por defecto
 */
export const getOptionalEnv = (key: string, defaultValue: string): string => {
    return import.meta.env[key] || defaultValue;
};
