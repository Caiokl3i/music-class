import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  csvEscape,
  csvLine,
  formatCsvAmount,
  inMonthRange,
  monthWindow,
} from '#services/month_export'

test.group('Month export helpers', () => {
  test('escapes semicolons, quotes and line breaks for CSV', ({ assert }) => {
    assert.equal(csvEscape('Ana'), 'Ana')
    assert.equal(csvEscape('PIX; dinheiro'), '"PIX; dinheiro"')
    assert.equal(csvEscape('disse "oi"'), '"disse ""oi"""')
    assert.equal(csvEscape('linha\nquebra'), '"linha\nquebra"')
    assert.equal(csvLine(['aula', 'Ana; Bia', null]), 'aula;"Ana; Bia";')
  })

  test('formats amounts for Brazilian Excel', ({ assert }) => {
    assert.equal(formatCsvAmount(130), '130,00')
    assert.equal(formatCsvAmount(35.5), '35,50')
  })

  test('builds the month window in the studio timezone', ({ assert }) => {
    const window = monthWindow('2026-09', 'America/Sao_Paulo')

    assert.equal(window.month, '2026-09')
    assert.equal(window.zone, 'America/Sao_Paulo')
    assert.equal(window.start.toISO(), '2026-09-01T00:00:00.000-03:00')
    assert.equal(window.end.toISO(), '2026-09-30T23:59:59.999-03:00')
  })

  test('keeps an instant on the September edge in Sao Paulo', ({ assert }) => {
    const { start, end } = monthWindow('2026-09', 'America/Sao_Paulo')
    const stillAugust = DateTime.fromISO('2026-09-01T02:00:00.000Z')
    const september = DateTime.fromISO('2026-09-01T03:00:00.000Z')

    assert.isFalse(inMonthRange(stillAugust, start, end))
    assert.isTrue(inMonthRange(september, start, end))
  })
})
