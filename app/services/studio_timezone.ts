import { DateTime } from 'luxon'

export const DEFAULT_STUDIO_ZONE = 'America/Sao_Paulo'

export function resolveStudioZone(timezone?: string | null) {
  const zone = timezone?.trim() || DEFAULT_STUDIO_ZONE
  return DateTime.now().setZone(zone).isValid ? zone : DEFAULT_STUDIO_ZONE
}

export function nowInStudioZone(timezone?: string | null) {
  return DateTime.now().setZone(resolveStudioZone(timezone)) as DateTime<true>
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

/** Lucid/SQLite datetime format. Query binds must be strings, not Luxon instances. */
const SQLITE_DATETIME = 'yyyy-MM-dd HH:mm:ss'

export function toSqliteDateTime(value: DateTime) {
  return value.toUTC().toFormat(SQLITE_DATETIME)
}

/**
 * Inclusive SQL range with a 1-day pad. Lucid stores zone-naive wall clocks,
 * so exact instant filters stay in JS after this narrows the result set.
 */
export function sqliteDateRange(start: DateTime, end: DateTime, padDays = 1) {
  return {
    start: toSqliteDateTime(start.minus({ days: padDays })),
    end: toSqliteDateTime(end.plus({ days: padDays })),
  }
}
