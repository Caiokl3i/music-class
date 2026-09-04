import { test } from '@japa/runner'
import { slugifyLabel } from '#services/plan_types'

test.group('Plan types helpers', () => {
  test('slugifies labels without accents or spaces', ({ assert }) => {
    assert.equal(slugifyLabel('Aula experimental'), 'aula_experimental')
    assert.equal(slugifyLabel('Pacote mensal 1'), 'pacote_mensal_1')
    assert.equal(slugifyLabel('  '), 'pacote')
  })
})
