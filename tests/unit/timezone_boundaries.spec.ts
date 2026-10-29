/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  DEFAULT_STUDIO_ZONE,
  monthWindow,
  resolveStudioZone,
  sqliteDateRange,
  toSqliteDateTime,
} from '#services/studio_timezone'
import { filterDoneLessons } from '#services/billing_message'
import type Lesson from '#models/lesson'

test.group('Timezone Boundaries (Characterization)', () => {
  test('resolves studio timezone with safe fallback on invalid zone', ({ assert }) => {
    assert.equal(resolveStudioZone('America/Sao_Paulo'), 'America/Sao_Paulo')
    assert.equal(resolveStudioZone('UTC'), 'UTC')
    assert.equal(resolveStudioZone(''), DEFAULT_STUDIO_ZONE)
    assert.equal(resolveStudioZone(null), DEFAULT_STUDIO_ZONE)
    assert.equal(resolveStudioZone('Invalid/Fake_Zone'), DEFAULT_STUDIO_ZONE)
  })

  test('monthWindow computes exact start and end for leap years and 31-day months', ({
    assert,
  }) => {
    const feb2024 = monthWindow('2024-02', 'America/Sao_Paulo')
    assert.equal(feb2024.start.toFormat('yyyy-MM-dd HH:mm:ss'), '2024-02-01 00:00:00')
    assert.equal(feb2024.end.toFormat('yyyy-MM-dd HH:mm:ss'), '2024-02-29 23:59:59')
    assert.equal(feb2024.month, '2024-02')

    const dec2026 = monthWindow('2026-12', 'America/Sao_Paulo')
    assert.equal(dec2026.start.toFormat('yyyy-MM-dd HH:mm:ss'), '2026-12-01 00:00:00')
    assert.equal(dec2026.end.toFormat('yyyy-MM-dd HH:mm:ss'), '2026-12-31 23:59:59')

    assert.throws(() => monthWindow('not-a-month'), 'Invalid month')
  })

  test('sqliteDateRange formats UTC string with 1-day padding across midnight', ({ assert }) => {
    const zone = 'America/Sao_Paulo'
    const window = monthWindow('2026-08', zone)
    const range = sqliteDateRange(window.start, window.end, 1)

    // start is 2026-08-01 00:00:00 -03:00 -> UTC 2026-08-01 03:00:00
    // padded start (1 day before) -> 2026-07-31 03:00:00
    assert.equal(range.start, '2026-07-31 03:00:00')

    // end is 2026-08-31 23:59:59.999 -03:00 -> UTC 2026-09-01 02:59:59
    // padded end (1 day after) -> 2026-09-02 02:59:59
    assert.equal(range.end, '2026-09-02 02:59:59')
  })

  test('toSqliteDateTime always produces yyyy-MM-dd HH:mm:ss in UTC', ({ assert }) => {
    const dt = DateTime.fromISO('2026-05-15T21:30:00', { zone: 'America/Sao_Paulo' })
    // 21:30 in UTC-3 is 00:30 on next day in UTC
    assert.equal(toSqliteDateTime(dt), '2026-05-16 00:30:00')
  })

  test('filterDoneLessons accurately handles midnight boundary lessons in the studio zone', ({
    assert,
  }) => {
    const zone = 'America/Sao_Paulo'
    const month = '2026-03'

    const lessons = [
      {
        id: 1,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-03-01T00:00:00', { zone }),
      },
      {
        id: 2,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-03-31T23:59:59', { zone }),
      },
      {
        id: 3,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-02-28T23:59:59', { zone }),
      },
      {
        id: 4,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-04-01T00:00:00', { zone }),
      },
      {
        id: 5,
        status: 'scheduled', // not done
        scheduledAt: DateTime.fromISO('2026-03-15T14:00:00', { zone }),
      },
    ] as Lesson[]

    const filtered = filterDoneLessons(lessons, month, zone)
    assert.lengthOf(filtered, 2)
    assert.deepEqual(
      filtered.map((l) => l.id),
      [1, 2]
    )
  })
})
