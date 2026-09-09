import { DateTime } from 'luxon'

export const DEFAULT_STUDIO_ZONE = 'America/Sao_Paulo'

export function resolveStudioZone(timezone?: string | null) {
  const zone = timezone?.trim() || DEFAULT_STUDIO_ZONE
  return DateTime.now().setZone(zone).isValid ? zone : DEFAULT_STUDIO_ZONE
}

export function monthWindow(month?: string | null, timezone?: string | null) {
  const zone = resolveStudioZone(timezone)
  const start = month
    ? DateTime.fromISO(`${month}-01`, { zone }).startOf('month')
    : DateTime.now().setZone(zone).startOf('month')

  if (!start.isValid) {
    throw new Error('Invalid month')
  }

  return {
    zone,
    month: start.toFormat('yyyy-MM'),
    start,
    end: start.endOf('month'),
  }
}
