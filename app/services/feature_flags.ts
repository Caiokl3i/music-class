const TRUTHY_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function normalizeFeatureFlagKey(name: string): string {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned.startsWith('FEATURE_') ? cleaned.slice('FEATURE_'.length) : cleaned
}

export function isFeatureEnabled(
  name: string,
  sourceEnv: Record<string, string | undefined> = process.env
): boolean {
  const key = normalizeFeatureFlagKey(name)
  if (!key) {
    return false
  }

  const raw = sourceEnv[`FEATURE_${key}`]
  if (!raw) {
    return false
  }

  return TRUTHY_FLAG_VALUES.has(raw.trim().toLowerCase())
}

export function getEnabledFeatures(
  sourceEnv: Record<string, string | undefined> = process.env
): Record<string, boolean> {
  const flags: Record<string, boolean> = {}

  for (const [envKey, rawValue] of Object.entries(sourceEnv)) {
    if (!envKey.startsWith('FEATURE_')) {
      continue
    }
    const shortKey = normalizeFeatureFlagKey(envKey)
    if (!shortKey) {
      continue
    }
    const clientName = shortKey.toLowerCase()
    flags[clientName] = rawValue ? TRUTHY_FLAG_VALUES.has(rawValue.trim().toLowerCase()) : false
  }

  return flags
}
