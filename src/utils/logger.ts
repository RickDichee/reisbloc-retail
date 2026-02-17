type Level = 'info' | 'warn' | 'error'

const tag: Record<Level, string> = {
  info: 'LOG',
  warn: 'WARN',
  error: 'ERROR'
}

const icon: Record<Level, string> = {
  info: '🔎',
  warn: '⚠️',
  error: '❌'
}

function format(level: Level, scope: string, message: string) {
  return `${tag[level]}${icon[level]} [${scope}] ${message}`
}

export const logger = {
  info(scope: string, message: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(format('info', scope, message), ...args)
  },
  warn(scope: string, message: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.warn(format('warn', scope, message), ...args)
  },
  error(scope: string, message: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.error(format('error', scope, message), ...args)
  }
}

export default logger
