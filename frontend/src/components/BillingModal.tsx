import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Download, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import * as plansService from '@/services/plans.service'
import type { BillingSummary, Plan, Student } from '@/types/api'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/utils/errors'
import { brazilTodayParts, formatCurrency } from '@/utils/format'

const billingSchema = z.object({
  scope: z.enum(['month', 'all']),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
})

type BillingFormValues = z.infer<typeof billingSchema>

type BillingModalProps = {
  open: boolean
  plan: Plan | null
  student: Student | null
  onClose: () => void
}

function currentMonthValue() {
  const parts = brazilTodayParts()
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`
}

function whatsappDigits(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

export function BillingModal({ open, plan, student, onClose }: BillingModalProps) {
  const toast = useToast()
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: { scope: 'month', month: currentMonthValue() },
  })

  const scope = form.watch('scope')
  const month = form.watch('month')

  useEffect(() => {
    if (!open || !plan) return
    form.reset({ scope: 'month', month: currentMonthValue() })
  }, [open, plan, form])

  useEffect(() => {
    if (!open || !plan) return

    let cancelled = false
    setLoading(true)
    void plansService
      .getPlanBilling(plan.id, scope === 'month' ? month : null)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setSummary(null)
          toast.error(getErrorMessage(error, 'Não foi possível gerar a cobrança.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, plan, scope, month, toast])

  async function copyText() {
    if (!summary?.text) return
    try {
      await navigator.clipboard.writeText(summary.text)
      toast.success('Mensagem copiada.')
    } catch {
      toast.error('Não foi possível copiar a mensagem.')
    }
  }

  async function downloadPdf() {
    if (!plan) return
    setDownloading(true)
    try {
      await plansService.downloadPlanBillingPdf(plan.id, scope === 'month' ? month : null)
      toast.success('PDF baixado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível baixar o PDF.'))
    } finally {
      setDownloading(false)
    }
  }

  const waNumber = whatsappDigits(student?.phone)
  const waHref =
    waNumber && summary?.text
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(summary.text)}`
      : null

  return (
    <Modal
      open={open}
      title="Gerar cobrança"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              <MessageCircle className="size-4" aria-hidden />
              WhatsApp
            </a>
          ) : null}
          <Button variant="secondary" onClick={() => void copyText()} disabled={!summary}>
            <Copy className="size-4" aria-hidden />
            Copiar
          </Button>
          <Button onClick={() => void downloadPdf()} disabled={!plan || downloading} loading={downloading}>
            <Download className="size-4" aria-hidden />
            Baixar PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Período"
            options={[
              { value: 'month', label: 'Mês específico' },
              { value: 'all', label: 'Todas as aulas feitas' },
            ]}
            {...form.register('scope')}
          />
          {scope === 'month' ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Mês</span>
              <input
                type="month"
                className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-ink focus:border-accent"
                {...form.register('month')}
              />
            </label>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {summary ? (
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Por aula" value={formatCurrency(summary.unitPrice)} />
            <Stat label="Aulas" value={String(summary.lessons.length)} />
            <Stat label="Descontos" value={formatCurrency(summary.discountTotal)} />
            <Stat label="Total" value={formatCurrency(summary.total)} />
          </dl>
        ) : null}

        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-3 text-sm text-ink">
          {loading ? 'Gerando…' : (summary?.text ?? 'Sem dados para exibir.')}
        </pre>
      </div>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}
