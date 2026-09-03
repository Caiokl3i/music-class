import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Package,
  Pencil,
  Phone,
  Plus,
  SquarePen,
  Trash2,
  UserRound,
} from 'lucide-react'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import * as lessonsService from '@/services/lessons.service'
import type { Lesson, LessonStatus, Plan, PlanPackage, PlanStatus, Student } from '@/types/api'
import { PageHeader, Card, SectionHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/TextArea'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LessonStatusBadge, PlanStatusBadge } from '@/components/StatusBadges'
import { GenerateLessonsModal } from '@/components/GenerateLessonsModal'
import { CreditBar } from '@/components/CreditBar'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateTimeRange,
  fromDatetimeLocalValue,
  toDatetimeLocalFromDate,
  toDatetimeLocalValue,
} from '@/utils/format'
import {
  bookablePlans,
  canGenerateLessons,
  isLowCredit,
  planHoldsCredits,
  planIsExpired,
} from '@/domain/status'
import {
  WEEKDAY_OPTIONS,
  addMinutesToDatetimeLocal,
  formatPreferredSchedule,
  moveDatetimeLocalKeepingDuration,
  preferredSlot,
} from '@/domain/schedule'

const lessonSchema = z
  .object({
    planId: z.string().min(1, 'Selecione o pacote'),
    scheduledAt: z.string().min(1, 'Informe o início'),
    endsAt: z.string().min(1, 'Informe o fim'),
    status: z.enum(['scheduled', 'done', 'cancelled', 'no_show']),
    description: z.string().optional(),
  })
  .refine((values) => new Date(values.endsAt) > new Date(values.scheduledAt), {
    message: 'O fim precisa ser depois do início',
    path: ['endsAt'],
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
  preferredWeekday: z.string().optional(),
  preferredTime: z.string().optional(),
})

type LessonFormValues = z.infer<typeof lessonSchema>
type PlanFormValues = z.infer<typeof planSchema>
type StudentFormValues = z.infer<typeof studentSchema>

export function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { packages, labelFor, optionFor, lowCreditThreshold, lessonDurationMinutes } = useCatalog()
  const previousStart = useRef('')
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
  const [openPlanId, setOpenPlanId] = useState<number | null>(null)

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { planId: '', scheduledAt: '', endsAt: '', status: 'scheduled', description: '' },
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
    return toDatetimeLocalFromDate(preferredSlot(student ?? {}, new Date()))
  }

  function openCreateLesson() {
    if (availablePlans.length === 0) {
      toast.error('Crie um pacote com aulas para agendar.')
      openCreatePlan()
      return
    }
    setEditingLesson(null)
    const scheduledAt = defaultSchedule()
    previousStart.current = scheduledAt
    lessonForm.reset({
      planId: String(availablePlans[0].id),
      scheduledAt,
      endsAt: addMinutesToDatetimeLocal(scheduledAt, lessonDurationMinutes),
      status: 'scheduled',
      description: '',
    })
    setLessonModalOpen(true)
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson)
    const scheduledAt = toDatetimeLocalValue(lesson.scheduledAt)
    const endsAt = lesson.endsAt
      ? toDatetimeLocalValue(lesson.endsAt)
      : addMinutesToDatetimeLocal(scheduledAt, lessonDurationMinutes)
    previousStart.current = scheduledAt
    lessonForm.reset({
      planId: String(lesson.planId),
      scheduledAt,
      endsAt,
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
      preferredWeekday: student.preferredWeekday ? String(student.preferredWeekday) : '',
      preferredTime: student.preferredTime ?? '',
    })
    setStudentModalOpen(true)
  }

  async function onSubmitLesson(values: LessonFormValues) {
    if (!student) return
    setSavingLesson(true)
    const payload = {
      planId: Number(values.planId),
      scheduledAt: fromDatetimeLocalValue(values.scheduledAt),
      endsAt: fromDatetimeLocalValue(values.endsAt),
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
      await studentsService.updateStudent(student.id, studentsService.studentFormPayload(values))
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
        title={
          <>
            {student.name}
            <Badge tone="success">Ativo</Badge>
          </>
        }
        description={`${student.instrument} • ${student.creditsRemaining} aula(s) a fazer`}
        actions={
          <>
            <Button variant="secondary" onClick={openEditStudent}>
              <SquarePen className="size-4" aria-hidden />
              Editar ficha
            </Button>
            <Button variant="secondary" onClick={openCreatePlan}>
              <Plus className="size-4" aria-hidden />
              Pacote
            </Button>
            <Button onClick={openCreateLesson}>
              <Plus className="size-4" aria-hidden />
              Agendar
            </Button>
          </>
        }
      />

      {isLowCredit(student.creditsRemaining, lowCreditThreshold) ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {student.creditsRemaining === 0
              ? 'Todas as aulas deste aluno já foram feitas. Venda um novo pacote.'
              : 'Resta 1 aula a fazer. Hora de vender o próximo pacote.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeader
            icon={<UserRound className="size-4" />}
            title="Sobre o aluno"
            actions={
              <Button size="sm" variant="secondary" onClick={openEditStudent}>
                Editar
              </Button>
            }
          />
          <dl className="space-y-4 text-sm">
            <InfoRow icon={<CalendarDays className="size-4" />} label="Nascimento">
              {formatDate(student.birthdate)}
            </InfoRow>
            <InfoRow icon={<Clock className="size-4" />} label="Horário usual">
              {formatPreferredSchedule(student.preferredWeekday, student.preferredTime) || '—'}
            </InfoRow>
            <InfoRow icon={<Phone className="size-4" />} label="Telefone">
              {student.phone || '—'}
            </InfoRow>
            <InfoRow icon={<FileText className="size-4" />} label="Observações">
              <span className="whitespace-pre-wrap">{student.description || '—'}</span>
            </InfoRow>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeader
            icon={<Package className="size-4" />}
            title="Pacotes"
            description="Pode pagar agora ou depois. Dá para abrir outro pacote mesmo com um pendente."
            actions={
              <Button size="sm" onClick={openCreatePlan}>
                <Plus className="size-4" aria-hidden />
                Novo pacote
              </Button>
            }
          />
          {plans.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum pacote ainda. Crie um para agendar aulas.</p>
          ) : (
            <ul className="space-y-3">
              {plans.map((plan) => {
                const expired = planIsExpired(plan)
                const open = openPlanId === plan.id
                const canMarkPaid = plan.status === 'pending'
                const canGenerate = canGenerateLessons(plan)
                return (
                  <li
                    key={plan.id}
                    className="rounded-lg border border-border bg-surface px-4 py-3.5"
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => setOpenPlanId(open ? null : plan.id)}
                      aria-expanded={open}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{labelFor(plan.package)}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {plan.lessonsDone}/{plan.lessonsTotal} aulas feitas ·{' '}
                          {formatCurrency(Number(plan.price))}
                          {plan.expiresAt ? ` · válido até ${formatDate(plan.expiresAt)}` : ''}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <PlanStatusBadge status={plan.status} />
                        {open ? (
                          <ChevronDown className="size-4 text-ink-muted" aria-hidden />
                        ) : (
                          <ChevronRight className="size-4 text-ink-muted" aria-hidden />
                        )}
                      </span>
                    </button>

                    <CreditBar
                      className="mt-3"
                      remaining={plan.lessonsRemaining}
                      total={plan.lessonsTotal}
                    />

                    {open ? (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {expired && plan.lessonsRemaining > 0 ? (
                          <p className="text-xs text-warning">
                            Pacote vencido. Não agenda mais aulas novas.
                          </p>
                        ) : null}
                        {!expired && plan.lessonsRemaining === 1 && planHoldsCredits(plan) ? (
                          <p className="text-xs text-warning">Resta 1 aula a fazer.</p>
                        ) : null}
                        {plan.paidAt ? (
                          <p className="text-xs text-ink-muted">
                            Pago em {formatDateTime(plan.paidAt)}
                          </p>
                        ) : null}
                        {plan.notes ? (
                          <p className="text-sm text-ink-muted whitespace-pre-wrap">{plan.notes}</p>
                        ) : null}
                        {canMarkPaid || canGenerate ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {canMarkPaid ? (
                              <Button size="sm" variant="secondary" onClick={() => markPaid(plan)}>
                                Marcar pago
                              </Button>
                            ) : null}
                            {canGenerate ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setGeneratingPlan(plan)}
                              >
                                Gerar aulas
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <SectionHeader
            icon={<CalendarDays className="size-4" />}
            title="Aulas"
            description={
              availablePlans.length === 0 && plans.length > 0
                ? 'Sem aulas para marcar neste pacote.'
                : undefined
            }
            actions={
              <Button size="sm" onClick={openCreateLesson}>
                <CalendarPlus className="size-4" aria-hidden />
                Agendar
              </Button>
            }
          />

          {upcomingLessons.length > 0 ? (
            <ul className="divide-y divide-border">
              {upcomingLessons.map((lesson) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  planLabel={labelFor(lesson.planPackage)}
                  onComplete={(item) => setLessonStatus(item, 'done')}
                  onNoShow={(item) => setLessonStatus(item, 'no_show')}
                  onCancel={(item) => setLessonStatus(item, 'cancelled')}
                  onEdit={openEditLesson}
                  onDelete={setDeletingLesson}
                />
              ))}
            </ul>
          ) : pastLessons.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula agendada.</p>
          ) : null}

          {pastLessons.length > 0 ? (
            <div className={upcomingLessons.length > 0 ? 'mt-6' : ''}>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="size-5 text-accent" aria-hidden />
                <h3 className="text-base font-semibold text-ink">Histórico</h3>
              </div>
              <ul className="divide-y divide-border">
                {pastLessons.map((lesson) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
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
            placeholder="Selecione um pacote com vaga"
            error={lessonForm.formState.errors.planId?.message}
            options={availablePlans.map((plan) => ({
              value: plan.id,
              label: `${labelFor(plan.package)} · ${plan.lessonsDone}/${plan.lessonsTotal} feitas`,
            }))}
            {...lessonForm.register('planId')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Início"
              type="datetime-local"
              error={lessonForm.formState.errors.scheduledAt?.message}
              {...lessonForm.register('scheduledAt', {
                onChange: (event) => {
                  const next = event.target.value
                  lessonForm.setValue(
                    'endsAt',
                    moveDatetimeLocalKeepingDuration(
                      previousStart.current,
                      lessonForm.getValues('endsAt'),
                      next,
                      lessonDurationMinutes,
                    ),
                  )
                  previousStart.current = next
                },
              })}
            />
            <Input
              label="Fim"
              type="datetime-local"
              hint="Padrão: 1 hora"
              error={lessonForm.formState.errors.endsAt?.message}
              {...lessonForm.register('endsAt')}
            />
          </div>
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
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {optionFor(selectedPackage).lessons} aula(s) por {formatCurrency(optionFor(selectedPackage).price)}
          </p>
          <Select
            label="Pagamento"
            error={planForm.formState.errors.status?.message}
            options={[
              { value: 'paid', label: 'Pago agora' },
              { value: 'pending', label: 'Pendente (aulas agora, paga depois)' },
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Dia da aula"
              error={studentForm.formState.errors.preferredWeekday?.message}
              options={[
                { value: '', label: 'Qualquer dia' },
                ...WEEKDAY_OPTIONS.map((day) => ({
                  value: String(day.value),
                  label: day.label,
                })),
              ]}
              {...studentForm.register('preferredWeekday')}
            />
            <Input
              label="Horário"
              type="time"
              hint="Padrão 14:00"
              error={studentForm.formState.errors.preferredTime?.message}
              {...studentForm.register('preferredTime')}
            />
          </div>
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
        preferredWeekday={student.preferredWeekday}
        preferredTime={student.preferredTime}
        onClose={() => setGeneratingPlan(null)}
        onGenerated={load}
      />

      <ConfirmDialog
        open={Boolean(deletingLesson)}
        title="Excluir aula?"
        description="A aula sai do histórico. Se já estava concluída, deixa de contar no pacote."
        loading={deleteLoading}
        onCancel={() => setDeletingLesson(null)}
        onConfirm={confirmDeleteLesson}
      />
    </div>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-accent">{label}</dt>
        <dd className="mt-0.5 text-ink-muted">{children}</dd>
      </div>
    </div>
  )
}

type LessonItemProps = {
  lesson: Lesson
  planLabel?: string
  onComplete?: (lesson: Lesson) => void
  onNoShow?: (lesson: Lesson) => void
  onCancel?: (lesson: Lesson) => void
  onEdit?: (lesson: Lesson) => void
  onDelete?: (lesson: Lesson) => void
}

function LessonItem({
  lesson,
  planLabel,
  onComplete,
  onNoShow,
  onCancel,
  onEdit,
  onDelete,
}: LessonItemProps) {
  const scheduled = lesson.status === 'scheduled'

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">
            {formatDateTimeRange(lesson.scheduledAt, lesson.endsAt)}
          </p>
          <LessonStatusBadge status={lesson.status} />
        </div>
        {planLabel ? <p className="mt-0.5 text-sm text-ink-muted">{planLabel}</p> : null}
        {lesson.description ? <p className="mt-1 text-sm text-ink">{lesson.description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {scheduled && onComplete ? (
          <Button size="sm" variant="secondary" onClick={() => onComplete(lesson)}>
            Concluir
          </Button>
        ) : null}
        {scheduled && onNoShow ? (
          <Button size="sm" variant="secondary" onClick={() => onNoShow(lesson)}>
            Falta
          </Button>
        ) : null}
        {scheduled && onCancel ? (
          <Button size="sm" variant="ghost" onClick={() => onCancel(lesson)}>
            Cancelar
          </Button>
        ) : null}
        {onEdit ? (
          <Button size="sm" variant="secondary" onClick={() => onEdit(lesson)}>
            <Pencil className="size-3.5" aria-hidden />
            Editar
          </Button>
        ) : null}
        {onDelete ? (
          <Button size="sm" variant="dangerSoft" onClick={() => onDelete(lesson)}>
            <Trash2 className="size-3.5" aria-hidden />
            Excluir
          </Button>
        ) : null}
      </div>
    </li>
  )
}
