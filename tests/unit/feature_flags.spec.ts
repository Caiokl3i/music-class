/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import {
  getEnabledFeatures,
  isFeatureEnabled,
  normalizeFeatureFlagKey,
} from '#services/feature_flags'

test.group('Phase 8 feature flags service', () => {
  test('normalizes flag names with or without FEATURE_ prefix', ({ assert }) => {
    assert.equal(normalizeFeatureFlagKey('new-mobile-ux'), 'NEW_MOBILE_UX')
    assert.equal(normalizeFeatureFlagKey('FEATURE_NEW_MOBILE_UX'), 'NEW_MOBILE_UX')
    assert.equal(normalizeFeatureFlagKey('   cookie.auth  '), 'COOKIE_AUTH')
  })

  test('evaluates truthy and falsy flag values deterministically', ({ assert }) => {
    const mockEnv = {
      FEATURE_ENABLED_ONE: '1',
      FEATURE_ENABLED_TRUE: 'true',
      FEATURE_ENABLED_YES: 'YES',
      FEATURE_ENABLED_ON: 'On',
      FEATURE_DISABLED_ZERO: '0',
      FEATURE_DISABLED_FALSE: 'false',
      FEATURE_DISABLED_EMPTY: '',
    }

    assert.isTrue(isFeatureEnabled('enabled_one', mockEnv))
    assert.isTrue(isFeatureEnabled('FEATURE_ENABLED_TRUE', mockEnv))
    assert.isTrue(isFeatureEnabled('enabled-yes', mockEnv))
    assert.isTrue(isFeatureEnabled('enabled_on', mockEnv))

    assert.isFalse(isFeatureEnabled('disabled_zero', mockEnv))
    assert.isFalse(isFeatureEnabled('disabled_false', mockEnv))
    assert.isFalse(isFeatureEnabled('disabled_empty', mockEnv))
    assert.isFalse(isFeatureEnabled('missing_flag', mockEnv))
  })

  test('lists only FEATURE_* variables coerced strictly to booleans without leaking secrets', ({
    assert,
  }) => {
    const mockEnv = {
      APP_KEY: 'super-secret-app-key',
      DATABASE_URL: 'postgres://secret',
      FEATURE_HTTP_ONLY_COOKIES: 'true',
      FEATURE_WHATSAPP_REMINDERS: '0',
    }

    assert.deepEqual(getEnabledFeatures(mockEnv), {
      http_only_cookies: true,
      whatsapp_reminders: false,
    })
  })
})
