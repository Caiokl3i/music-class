const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function normalizeClientFlagKey(name: string): string {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned.startsWith('VITE_FEATURE_') ? cleaned.slice('VITE_FEATURE_'.length) : cleaned
}

/**
 * Checks whether a Phase 8 feature flag is enabled on the frontend via `VITE_FEATURE_<NAME>`.
 * Safe to toggle in Vercel Environment Variables without altering business logic.
 */
export function isClientFeatureEnabled(name: string): boolean {
  const key = normalizeClientFlagKey(name)
  if (!key) {
    return false
  }

  const envMap = import.meta.env as Record<string, unknown>
  const raw = envMap[`VITE_FEATURE_${key}`]
  if (typeof raw === 'boolean') {
    return raw
  }
  if (typeof raw !== 'string') {
    return false
  }

  return TRUTHY_VALUES.has(raw.trim().toLowerCase())
}
