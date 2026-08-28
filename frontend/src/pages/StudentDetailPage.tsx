import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus } from 'lucide-react'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import * as lessonsService from '@/services/lessons.service'
import type { Lesson, LessonStatus, Plan, PlanPackage, PlanStatus, Student } from '@/types/api'
import { PageHeader, Card, SectionHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/TextArea'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LessonRow } from '@/components/LessonRow'
import { PlanStatusBadge } from '@/components/StatusBadges'
import { GenerateLessonsModal } from '@/components/GenerateLessonsModal'
import { CreditBar } from '@/components/CreditBar'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import {
  formatCurrency,
  formatDate,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/utils/format'
import { bookablePlans, canGenerateLessons, isLowCredit, planIsExpired } from '@/domain/status'

const lessonSchema = z.object({
  planId: z.string().min(1, 'Selecione o pacote'),
  scheduledAt: z.string().min(1, 'Informe data e hora'),
  status: z.enum(['scheduled', 'done', 'cancelled', 'no_show']),
  description: z.string().optional(),
})

const planSchema = z.object({
  package: z.enum(['single', 'pack_4', 'pack_8']),
  status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().optional(),
})

const studentSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  instrument: z.string().min(1, 'Informe o instrumento'),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  description: z.string().optional(),
})

type LessonFormValues = z.infer<typeof lessonSchema>
type PlanFormValues = z.infer<typeof planSchema>
type StudentFormValues = z.infer<typeof studentSchema>

export function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { packages, labelFor, optionFor, lowCreditThreshold } = useCatalog()
  const [student, setStudent] = useState<Student | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [savingLesson, setSavingLesson] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState<Plan | null>(null)

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { planId: '', scheduledAt: '', status: 'scheduled', description: '' },
  })

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { package: 'pack_4', status: 'paid', notes: '' },
  })

  const studentForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
  })

  const selectedPackage = planForm.watch('package') as PlanPackage
  const availablePlans = useMemo(
    () => bookablePlans(plans, editingLesson?.planId),
    [plans, editingLesson],
  )

  const upcomingLessons = useMemo(
    () => lessons.filter((lesson) => lesson.status === 'scheduled'),
    [lessons],
  )
  const pastLessons = useMemo(
    () => lessons.filter((lesson) => lesson.status !== 'scheduled'),
    [lessons],
  )

  const load = useCallback(async () => {
    const studentId = Number(id)
    if (!studentId) {
      navigate('/students')
      return
    }
    setLoading(true)
    try {
      const studentData = await studentsService.getStudent(studentId)
      setStudent(studentData)
      const [plansResult, lessonsResult] = await Promise.allSettled([
        plansService.listPlans(studentId),
        lessonsService.listLessonsForStudent(studentId),
      ])
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value)
      else toast.error(getErrorMessage(plansResult.reason, 'Não foi possível carregar os pacotes.'))
      if (lessonsResult.status === 'fulfilled') setLessons(lessonsResult.value)
      else toast.error(getErrorMessage(lessonsResult.reason, 'Não foi possível carregar as aulas.'))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar o aluno.'))
      navigate('/students')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, toast])

  useEffect(() => {
    void load()
  }, [load])

  function defaultSchedule() {
    const base = new Date()
    base.setHours(14, 0, 0, 0)
    return toDatetimeLocalValue(base.toISOString())
  }

  function openCreateLesson() {
    if (availablePlans.length === 0) {
      toast.error('Crie um pacote pago com créditos para agendar.')
      openCreatePlan()
      return
    }
    setEditingLesson(null)
    lessonForm.reset({
      planId: String(availablePlans[0].id),
      scheduledAt: defaultSchedule(),
      status: 'scheduled',
      description: '',
    })
    setLessonModalOpen(true)
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson)
    lessonForm.reset({
      planId: String(lesson.planId),
      scheduledAt: toDatetimeLocalValue(lesson.scheduledAt),
      status: lesson.status,
      description: lesson.description ?? '',
    })
    setLessonModalOpen(true)
  }

  function openCreatePlan() {
    planForm.reset({ package: 'pack_4', status: 'paid', notes: '' })
    setPlanModalOpen(true)
  }

  function openEditStudent() {
    if (!student) return
    studentForm.reset({
      name: student.name,
      instrument: student.instrument,
      phone: student.phone ?? '',
      birthdate: student.birthdate?.slice(0, 10) ?? '',
      description: student.description ?? '',
    })
    setStudentModalOpen(true)
  }

  async function onSubmitLesson(values: LessonFormValues) {
    if (!student) return
    setSavingLesson(true)
    const payload = {
      planId: Number(values.planId),
      scheduledAt: fromDatetimeLocalValue(values.scheduledAt),
      status: values.status as LessonStatus,
      description: values.description || null,
    }
    try {
      if (editingLesson) {
        await lessonsService.updateLesson(editingLesson.id, payload)
        toast.success('Aula atualizada.')
      } else {
        await lessonsService.createLessonForStudent(student.id, payload)
        toast.success('Aula agendada.')
      }
      setLessonModalOpen(false)
      await load()
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) lessonForm.setError(field as keyof LessonFormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar a aula.'))
    } finally {
      setSavingLesson(false)
    }
  }

  async function onSubmitPlan(values: PlanFormValues) {
    if (!student) return
    setSavingPlan(true)
    try {
      await plansService.createPlan({
        studentId: student.id,
        package: values.package,
        status: values.status as PlanStatus,
        notes: values.notes || null,
      })
      toast.success('Pacote criado.')
      setPlanModalOpen(false)
      await load()
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) planForm.setError(field as keyof PlanFormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível criar o pacote.'))
    } finally {
      setSavingPlan(false)
    }
  }

  async function onSubmitStudent(values: StudentFormValues) {
    if (!student) return
    setSavingStudent(true)
    try {
      await studentsService.updateStudent(student.id, {
        name: values.name,
        instrument: values.instrument,
        phone: values.phone || null,
        birthdate: values.birthdate || null,
        description: values.description || null,
      })
      toast.success('Aluno atualizado.')
      setStudentModalOpen(false)
      await load()
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) studentForm.setError(field as keyof StudentFormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o aluno.'))
    } finally {
      setSavingStudent(false)
    }
  }

  async function setLessonStatus(lesson: Lesson, status: LessonStatus) {
    try {
      await lessonsService.updateLesson(lesson.id, { status })
      toast.success('Status atualizado.')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o status.'))
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

  async function confirmDeleteLesson() {
    if (!deletingLesson) return
    setDeleteLoading(true)
    try {
      await lessonsService.deleteLesson(deletingLesson.id)
      toast.success('Aula excluída.')
      setDeletingLesson(null)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível excluir a aula.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading || !student) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/students')}>
        <ArrowLeft className="size-4" />
        Alunos
      </Button>
      <PageHeader
        title={student.name}
        description={`${student.instrument}${student.phone ? ` · ${student.phone}` : ''} · ${student.creditsRemaining} crédito(s) restante(s)`}
        actions={
          <>
            <Button variant="secondary" onClick={openEditStudent}>
              Editar ficha
            </Button>
            <Button variant="secondary" onClick={openCreatePlan}>
              <Plus className="size-4" />
              Pacote
            </Button>
            <Button onClick={openCreateLesson}>
              <Plus className="size-4" />
              Agendar
            </Button>
          </>
        }
      />

      {isLowCredit(student.creditsRemaining, lowCreditThreshold) ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {student.creditsRemaining === 0
            ? 'Sem créditos usáveis. Venda um novo pacote para continuar agendando.'
            : 'Resta 1 crédito. Hora de vender o próximo pacote.'}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeader
            title="Sobre"
            actions={
              <Button size="sm" variant="ghost" onClick={openEditStudent}>
                Editar
              </Button>
            }
          />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted">Nascimento</dt>
              <dd className="font-medium">{formatDate(student.birthdate)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Telefone</dt>
              <dd className="font-medium">{student.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Observações</dt>
              <dd className="font-medium whitespace-pre-wrap">{student.description || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeader
            title="Pacotes"
            description="Só pacote pago libera crédito para agendar."
            actions={
              <Button size="sm" variant="ghost" onClick={openCreatePlan}>
                Novo
              </Button>
            }
          />
          {plans.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum pacote ainda. Crie um para agendar aulas.</p>
          ) : (
            <ul className="space-y-4">
              {plans.map((plan) => {
                const expired = planIsExpired(plan)
                return (
                <li key={plan.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{labelFor(plan.package)}</p>
                      <p className="text-xs text-ink-muted">
                        {plan.lessonsRemaining}/{plan.lessonsTotal} créditos · {formatCurrency(Number(plan.price))}
                        {plan.expiresAt
                          ? ` · válido até ${formatDate(plan.expiresAt)}`
                          : ''}
                      </p>
                      {expired && plan.lessonsRemaining > 0 ? (
                        <p className="mt-1 text-xs text-amber-800">Pacote vencido. Esses créditos não agendam mais.</p>
                      ) : null}
                      {!expired && isLowCredit(plan.lessonsRemaining, lowCreditThreshold) && plan.status === 'paid' ? (
                        <p className="mt-1 text-xs text-amber-800">
                          {plan.lessonsRemaining === 0 ? 'Créditos acabaram.' : 'Resta 1 crédito neste pacote.'}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <PlanStatusBadge status={plan.status} />
                      {plan.status === 'pending' ? (
                        <Button size="sm" variant="secondary" onClick={() => markPaid(plan)}>
                          Marcar pago
                        </Button>
                      ) : null}
                      {canGenerateLessons(plan) ? (
                        <Button size="sm" variant="secondary" onClick={() => setGeneratingPlan(plan)}>
                          Gerar aulas
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2">
                    <CreditBar remaining={plan.lessonsRemaining} total={plan.lessonsTotal} />
                  </div>
                </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <SectionHeader
            title="Aulas"
            description={
              availablePlans.length === 0 && plans.length > 0
                ? 'Sem créditos em pacotes pagos.'
                : undefined
            }
            actions={
              <Button size="sm" onClick={openCreateLesson}>
                Agendar
              </Button>
            }
          />
          {upcomingLessons.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula agendada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingLessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  showStudent={false}
                  planLabel={labelFor(lesson.planPackage)}
                  onComplete={(item) => setLessonStatus(item, 'done')}
                  onNoShow={(item) => setLessonStatus(item, 'no_show')}
                  onCancel={(item) => setLessonStatus(item, 'cancelled')}
                  onEdit={openEditLesson}
                  onDelete={setDeletingLesson}
                />
              ))}
            </ul>
          )}
          {pastLessons.length > 0 ? (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Histórico
              </h3>
              <ul className="divide-y divide-border">
                {pastLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    showStudent={false}
                    planLabel={labelFor(lesson.planPackage)}
                    onEdit={openEditLesson}
                    onDelete={setDeletingLesson}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        open={lessonModalOpen}
        title={editingLesson ? `Editar aula · ${student.name}` : `Agendar · ${student.name}`}
        onClose={() => setLessonModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLessonModalOpen(false)} disabled={savingLesson}>
              Fechar
            </Button>
            <Button loading={savingLesson} onClick={lessonForm.handleSubmit(onSubmitLesson)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={lessonForm.handleSubmit(onSubmitLesson)}>
          <Select
            label="Pacote"
            placeholder="Selecione um pacote pago com crédito"
            error={lessonForm.formState.errors.planId?.message}
            options={availablePlans.map((plan) => ({
              value: plan.id,
              label: `${labelFor(plan.package)} · ${plan.lessonsRemaining}/${plan.lessonsTotal} créditos`,
            }))}
            {...lessonForm.register('planId')}
          />
          <Input
            label="Data e hora"
            type="datetime-local"
            error={lessonForm.formState.errors.scheduledAt?.message}
            {...lessonForm.register('scheduledAt')}
          />
          <Select
            label="Status"
            error={lessonForm.formState.errors.status?.message}
            options={[
              { value: 'scheduled', label: 'Agendada' },
              { value: 'done', label: 'Concluída' },
              { value: 'no_show', label: 'Falta' },
              { value: 'cancelled', label: 'Cancelada' },
            ]}
            {...lessonForm.register('status')}
          />
          <TextArea
            label="Anotações"
            error={lessonForm.formState.errors.description?.message}
            {...lessonForm.register('description')}
          />
        </form>
      </Modal>

      <Modal
        open={planModalOpen}
        title={`Novo pacote · ${student.name}`}
        onClose={() => setPlanModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanModalOpen(false)} disabled={savingPlan}>
              Fechar
            </Button>
            <Button loading={savingPlan} onClick={planForm.handleSubmit(onSubmitPlan)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={planForm.handleSubmit(onSubmitPlan)}>
          <Select
            label="Pacote"
            error={planForm.formState.errors.package?.message}
            options={packages.map((item) => ({
              value: item.value,
              label: `${item.label} — ${item.lessons} aula(s) · ${formatCurrency(item.price)}`,
            }))}
            {...planForm.register('package')}
          />
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {optionFor(selectedPackage).lessons} créditos por {formatCurrency(optionFor(selectedPackage).price)}
          </p>
          <Select
            label="Pagamento"
            error={planForm.formState.errors.status?.message}
            options={[
              { value: 'paid', label: 'Pago agora' },
              { value: 'pending', label: 'Pendente (não agenda ainda)' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            {...planForm.register('status')}
          />
          <TextArea
            label="Observações"
            error={planForm.formState.errors.notes?.message}
            {...planForm.register('notes')}
          />
        </form>
      </Modal>

      <Modal
        open={studentModalOpen}
        title="Editar aluno"
        onClose={() => setStudentModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStudentModalOpen(false)} disabled={savingStudent}>
              Fechar
            </Button>
            <Button loading={savingStudent} onClick={studentForm.handleSubmit(onSubmitStudent)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={studentForm.handleSubmit(onSubmitStudent)}>
          <Input label="Nome" error={studentForm.formState.errors.name?.message} {...studentForm.register('name')} />
          <Input
            label="Instrumento"
            error={studentForm.formState.errors.instrument?.message}
            {...studentForm.register('instrument')}
          />
          <Input label="Telefone" error={studentForm.formState.errors.phone?.message} {...studentForm.register('phone')} />
          <Input
            label="Data de nascimento"
            type="date"
            error={studentForm.formState.errors.birthdate?.message}
            {...studentForm.register('birthdate')}
          />
          <TextArea
            label="Observações"
            error={studentForm.formState.errors.description?.message}
            {...studentForm.register('description')}
          />
        </form>
      </Modal>

      <GenerateLessonsModal
        plan={generatingPlan}
        studentName={student.name}
        onClose={() => setGeneratingPlan(null)}
        onGenerated={load}
      />

      <ConfirmDialog
        open={Boolean(deletingLesson)}
        title="Excluir aula?"
        description="A aula sai do histórico. Se ela consumia crédito, o crédito volta ao pacote."
        loading={deleteLoading}
        onCancel={() => setDeletingLesson(null)}
        onConfirm={confirmDeleteLesson}
      />
    </div>
  )
}
