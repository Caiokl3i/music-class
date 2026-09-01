import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { BookOpen, Package, Plus } from 'lucide-react'
import * as plansService from '@/services/plans.service'
import * as studentsService from '@/services/students.service'
import type { PlanPackage, PlanStatus, Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'

const schema = z.object({
  studentId: z.string().min(1, 'Selecione o aluno'),
  package: z.enum(['single', 'pack_4', 'pack_8']),
  status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PlansPage() {
  const toast = useToast()
  const { packages, optionFor, creditValidityDays, loading: catalogLoading } = useCatalog()
  const [students, setStudents] = useState<Student[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { package: 'pack_4', status: 'paid', studentId: '', notes: '' },
  })

  const selectedPackage = watch('package') as PlanPackage

  const loadStudents = useCallback(async () => {
    try {
      setStudents(await studentsService.listStudents())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar os alunos.'))
    }
  }, [toast])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  function openCreate(pack?: PlanPackage) {
    reset({
      studentId: '',
      package: pack ?? 'pack_4',
      status: 'paid',
      notes: '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      await plansService.createPlan({
        studentId: Number(values.studentId),
        package: values.package,
        status: values.status as PlanStatus,
        notes: values.notes || null,
      })
      toast.success('Pacote vendido.')
      setModalOpen(false)
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) setError(field as keyof FormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o pacote.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pacotes"
        description="Tipos de pacote disponíveis. Venda um para o aluno na ficha dele ou por aqui."
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="size-4" />
            Vender pacote
          </Button>
        }
      />

      {catalogLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((item, index) => {
            const perLesson = item.price / item.lessons
            return (
              <motion.li
                key={item.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.04 }}
                className="flex flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/[0.03]"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  {item.lessons === 1 ? (
                    <BookOpen className="size-5" aria-hidden />
                  ) : (
                    <Package className="size-5" aria-hidden />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-ink">{item.label}</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {item.lessons} aula{item.lessons === 1 ? '' : 's'} · válidas por{' '}
                  {creditValidityDays} dias
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                  {formatCurrency(item.price)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatCurrency(perLesson)} por aula
                </p>
                <div className="mt-auto pt-5">
                  <Button className="w-full" variant="secondary" onClick={() => openCreate(item.value)}>
                    Vender este
                  </Button>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title="Vender pacote"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Fechar
            </Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Aluno"
            placeholder="Selecione"
            error={errors.studentId?.message}
            options={students.map((student) => ({ value: student.id, label: student.name }))}
            {...register('studentId')}
          />
          <Select
            label="Pacote"
            error={errors.package?.message}
            options={packages.map((item) => ({
              value: item.value,
              label: `${item.label} — ${item.lessons} aula(s) · ${formatCurrency(item.price)}`,
            }))}
            {...register('package')}
          />
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {optionFor(selectedPackage).lessons} aula(s) por{' '}
            {formatCurrency(optionFor(selectedPackage).price)}
          </p>
          <Select
            label="Pagamento"
            error={errors.status?.message}
            options={[
              { value: 'paid', label: 'Pago agora' },
              { value: 'pending', label: 'Pendente (aulas agora, paga depois)' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            {...register('status')}
          />
          <TextArea label="Observações" error={errors.notes?.message} {...register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
