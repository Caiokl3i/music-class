import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/TextArea'
import * as plansService from '@/services/plans.service'
import type { Plan, PlanDiscount } from '@/types/api'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'

const discountSchema = z.object({
  name: z.string().min(1, 'Informe o nome do desconto'),
  amount: z.string().min(1, 'Informe o valor'),
  serviceAt: z.string().optional(),
  notes: z.string().optional(),
})

type DiscountFormValues = z.infer<typeof discountSchema>

type PlanDiscountModalProps = {
  open: boolean
  plan: Plan | null
  discount: PlanDiscount | null
  onClose: () => void
  onSaved: () => void
}

export function PlanDiscountModal({
  open,
  plan,
  discount,
  onClose,
  onSaved,
}: PlanDiscountModalProps) {
  const toast = useToast()
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: { name: '', amount: '', serviceAt: '', notes: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: discount?.name ?? '',
      amount: discount ? String(discount.amount) : '',
      serviceAt: discount?.serviceAt?.slice(0, 10) ?? '',
      notes: discount?.notes ?? '',
    })
  }, [open, discount, form])

  async function onSubmit(values: DiscountFormValues) {
    if (!plan) return
    const amount = Number(values.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      form.setError('amount', { message: 'Valor inválido' })
      return
    }

    try {
      const payload = {
        name: values.name.trim(),
        amount,
        serviceAt: values.serviceAt || null,
        notes: values.notes?.trim() || null,
      }
      if (discount) {
        await plansService.updatePlanDiscount(plan.id, discount.id, payload)
        toast.success('Desconto atualizado.')
      } else {
        await plansService.createPlanDiscount(plan.id, payload)
        toast.success('Desconto adicionado.')
      }
      onSaved()
      onClose()
    } catch (error) {
      const fields = getFieldErrors(error)
      if (fields.name) form.setError('name', { message: fields.name })
      if (fields.amount) form.setError('amount', { message: fields.amount })
      if (fields.serviceAt) form.setError('serviceAt', { message: fields.serviceAt })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o desconto.'))
    }
  }

  return (
    <Modal
      open={open}
      title={discount ? 'Editar desconto' : 'Adicionar desconto'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} loading={form.formState.isSubmitting}>
            Salvar
          </Button>
        </div>
      }
    >
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Input
          label="Nome"
          placeholder="Ex.: Desconto sobrancelhas"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Valor (R$)"
          inputMode="decimal"
          placeholder="25,00"
          error={form.formState.errors.amount?.message}
          {...form.register('amount')}
        />
        <Input
          label="Data do serviço"
          type="date"
          hint="Opcional — aparece na cobrança do mês"
          error={form.formState.errors.serviceAt?.message}
          {...form.register('serviceAt')}
        />
        <TextArea label="Observações" rows={2} {...form.register('notes')} />
      </form>
    </Modal>
  )
}
