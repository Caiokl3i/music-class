import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { Package, Plus } from 'lucide-react'
import * as plansService from '@/services/plans.service'
import * as studentsService from '@/services/students.service'
import type { Plan, PlanPackage, PlanStatus, Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { PlanStatusBadge } from '@/components/StatusBadges'
import { GenerateLessonsModal } from '@/components/GenerateLessonsModal'
import { CreditBar } from '@/components/CreditBar'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { canGenerateLessons, isLowCredit, planIsExpired } from '@/domain/status'

const schema = z.object({
  studentId: z.string().min(1, 'Selecione o aluno'),
  package: z.enum(['single', 'pack_4', 'pack_8']),
  status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PlansPage() {
  const toast = useToast()
  const { packages, labelFor, optionFor } = useCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterStudentId = searchParams.get('studentId') ?? ''

  const [plans, setPlans] = useState<Plan[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Plan | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [generating, setGenerating] = useState<Plan | null>(null)

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
  const studentsMap = useMemo(() => {
    const map = new Map<number, Student>()
    students.forEach((student) => map.set(student.id, student))
    return map
  }, [students])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const studentFilter = filterStudentId ? Number(filterStudentId) : undefined
      const [plansData, studentsData] = await Promise.all([
        plansService.listPlans(studentFilter),
        studentsService.listStudents(),
      ])
      setPlans(plansData)
      setStudents(studentsData)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar os pacotes.'))
    } finally {
      setLoading(false)
    }
  }, [filterStudentId, toast])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    reset({
      studentId: filterStudentId || '',
      package: 'pack_4',
      status: 'paid',
      notes: '',
    })
    setModalOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    reset({
      studentId: String(plan.studentId),
      package: plan.package,
      status: plan.status,
      notes: plan.notes ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const payload = {
      studentId: Number(values.studentId),
      package: values.package,
      status: values.status as PlanStatus,
      notes: values.notes || null,
    }
    try {
      if (editing) {
        await plansService.updatePlan(editing.id, payload)
        toast.success('Pacote atualizado.')
      } else {
        await plansService.createPlan(payload)
        toast.success('Pacote criado.')
      }
      setModalOpen(false)
      await load()
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

  async function markPaid(plan: Plan) {
    try {
      await plansService.updatePlan(plan.id, { status: 'paid' })
      toast.success('Pacote marcado como pago.')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o pagamento.'))
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await plansService.deletePlan(deleting.id)
      toast.success('Pacote excluído.')
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível excluir o pacote.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pacotes"
        description="Créditos só entram na agenda depois que o pacote está pago."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Novo pacote
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Filtrar por aluno"
          value={filterStudentId}
          onChange={(event) => {
            const value = event.target.value
            if (value) setSearchParams({ studentId: value })
            else setSearchParams({})
          }}
          options={[
            { value: '', label: 'Todos os alunos' },
            ...students.map((student) => ({ value: student.id, label: student.name })),
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="Nenhum pacote"
          description="Crie um pacote após cadastrar um aluno para liberar créditos de aulas."
          actionLabel="Criar pacote"
          onAction={openCreate}
        />
      ) : (
        <ul className="space-y-3">
          {plans.map((plan, index) => {
            const student = studentsMap.get(plan.studentId)
            return (
              <motion.li
                key={plan.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.2) }}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{labelFor(plan.package)}</h3>
                      <PlanStatusBadge status={plan.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      <Link
                        to={`/students/${plan.studentId}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {student?.name ?? `Aluno #${plan.studentId}`}
                      </Link>
                      {' · '}
                      {formatCurrency(Number(plan.price))}
                    </p>
                    <p className="mt-2 text-sm text-ink">
                      <span className="font-medium text-brand-700">{plan.lessonsRemaining}</span>
                      <span className="text-ink-muted"> / {plan.lessonsTotal} créditos restantes</span>
                    </p>
                    {plan.expiresAt ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        Válido até {formatDate(plan.expiresAt)}
                        {planIsExpired(plan) ? ' · vencido' : ''}
                      </p>
                    ) : null}
                    {plan.status === 'paid' && isLowCredit(plan.lessonsRemaining) ? (
                      <p className="mt-1 text-xs text-amber-800">
                        {plan.lessonsRemaining === 0 ? 'Créditos acabaram.' : 'Resta 1 crédito.'}
                      </p>
                    ) : null}
                    {plan.paidAt ? (
                      <p className="mt-1 text-xs text-ink-muted">Pago em {formatDateTime(plan.paidAt)}</p>
                    ) : null}
                    {plan.notes ? <p className="mt-2 text-sm text-ink-muted">{plan.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.status === 'pending' ? (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(plan)}>
                        Marcar pago
                      </Button>
                    ) : null}
                    {canGenerateLessons(plan) ? (
                      <Button size="sm" variant="secondary" onClick={() => setGenerating(plan)}>
                        Gerar aulas
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => openEdit(plan)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(plan)}>
                      Excluir
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <CreditBar remaining={plan.lessonsRemaining} total={plan.lessonsTotal} />
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar pacote' : 'Novo pacote'}
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
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {optionFor(selectedPackage).lessons} créditos por {formatCurrency(optionFor(selectedPackage).price)}
          </p>
          <Select
            label="Pagamento"
            error={errors.status?.message}
            options={[
              { value: 'paid', label: 'Pago agora' },
              { value: 'pending', label: 'Pendente (não agenda ainda)' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            {...register('status')}
          />
          <TextArea label="Observações" error={errors.notes?.message} {...register('notes')} />
        </form>
      </Modal>

      <GenerateLessonsModal
        plan={generating}
        studentName={studentsMap.get(generating?.studentId ?? 0)?.name ?? 'aluno'}
        onClose={() => setGenerating(null)}
        onGenerated={load}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir pacote?"
        description="As aulas vinculadas a este pacote também serão removidas."
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
