type SecurityLogger = {
  info: (payload: Record<string, unknown>, message?: string) => void
  warn: (payload: Record<string, unknown>, message?: string) => void
}

/**
 * Structured auth/security events. Never pass passwords, tokens, or invite codes.
 */
export function logSecurityEvent(
  logger: SecurityLogger,
  level: 'info' | 'warn',
  event: string,
  data: Record<string, unknown> = {}
) {
  logger[level]({ event, ...data }, event)
}
