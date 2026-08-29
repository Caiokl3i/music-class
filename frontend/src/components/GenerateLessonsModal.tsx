import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import * as plansService from '@/services/plans.service'
import type { Plan } from '@/types/api'
import { weeklySlots } from '@/domain/schedule'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/utils/errors'
import { formatWeekdayDateTime, fromDatetimeLocalValue, toDatetimeLocalValue } from '@/utils/format'

function defaultFirstSlot() {
  const base = new Date()
  const day = base.getDay()
  const daysUntilTuesday = (2 - day + 7) % 7 || 7
  base.setDate(base.getDate() + daysUntilTuesday)
  base.setHours(14, 0, 0, 0)
  return toDatetimeLocalValue(base.toISOString())
}

export function GenerateLessonsModal({
  plan,
  studentName,
  onClose,
  onGenerated,
}: {
  plan: Plan | null
  studentName: string
  onClose: () => void
  onGenerated: () => Promise<void> | void
}) {
  const toast = useToast()
  const [firstAt, setFirstAt] = useState(defaultFirstSlot)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (plan) setFirstAt(defaultFirstSlot())
  }, [plan])

  const preview = useMemo(() => {
    if (!plan || !firstAt) return []
    const first = new Date(firstAt)
    if (Number.isNaN(first.getTime())) return []
    const until = plan.expiresAt ? new Date(plan.expiresAt) : null
    return weeklySlots(first, plan.lessonsSchedulable, until)
  }, [firstAt, plan])

  async function submit() {
    if (!plan) return
    setSaving(true)
    try {
      const created = await plansService.generatePlanLessons(plan.id, fromDatetimeLocalValue(firstAt))
      const skipped = plan.lessonsSchedulable - created.length
      toast.success(
        skipped > 0
          ? `${created.length} aula(s) criadas. ${skipped} ficaram fora da validade.`
          : `${created.length} aula(s) criadas.`,
      )
      onClose()
      await onGenerated()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível gerar as aulas.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={Boolean(plan)}
      title={`Gerar aulas · ${studentName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Fechar
          </Button>
          <Button loading={saving} onClick={() => void submit()} disabled={preview.length === 0}>
            Criar {preview.length || 0} aula(s)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Cria as {plan?.lessonsSchedulable ?? 0} aula(s) que ainda faltam marcar, toda semana no mesmo horário.
        </p>
        <Input
          label="Primeira aula"
          type="datetime-local"
          value={firstAt}
          onChange={(event) => setFirstAt(event.target.value)}
        />
        {preview.length === 0 ? (
          <p className="text-sm text-warning-on-soft">Nenhuma data cabe na validade deste pacote.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-auto text-sm text-ink">
            {preview.map((slot) => (
              <li key={slot.toISOString()}>{formatWeekdayDateTime(slot)}</li>
            ))}
          </ul>
        )}
        {plan && preview.length < plan.lessonsSchedulable ? (
          <p className="text-xs text-ink-muted">
            {plan.lessonsSchedulable - preview.length} aula(s) ficam de fora porque a data cai depois da
            validade.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
