import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import * as lessonsService from '@/services/lessons.service'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import type { Lesson, LessonStatus, Plan, Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { LessonRow } from '@/components/LessonRow'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import {
  formatTimeRange,
  fromDatetimeLocalValue,
  toDatetimeLocalFromDate,
  toDatetimeLocalValue,
} from '@/utils/format'
import {
  addMinutesToDatetimeLocal,
  moveDatetimeLocalKeepingDuration,
  preferredSlot,
} from '@/domain/schedule'
import { bookablePlans } from '@/domain/status'

const schema = z
  .object({
    studentId: z.string().min(1, 'Selecione o aluno'),
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

type FormValues = z.infer<typeof schema>
type ViewMode = 'list' | 'calendar'

export function LessonsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { labelFor, lessonDurationMinutes } = useCatalog()
  const previousStart = useRef('')
  const [view, setView] = useState<ViewMode>('calendar')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Lesson | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [filterStudentId, setFilterStudentId] = useState('')
  const [createDay, setCreateDay] = useState<Date | undefined>()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      planId: '',
      scheduledAt: '',
      endsAt: '',
      status: 'scheduled',
      description: '',
    },
  })

  const formStudentId = watch('studentId')
  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const availablePlans = useMemo(() => {
    const studentId = Number(formStudentId)
    if (!studentId) return []
    return bookablePlans(
      plans.filter((plan) => plan.studentId === studentId),
      editing?.planId,
    )
  }, [plans, formStudentId, editing])

  const filteredLessons = useMemo(() => {
    if (!filterStudentId) return lessons
    return lessons.filter((lesson) => lesson.studentId === Number(filterStudentId))
  }, [lessons, filterStudentId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lessonsData, studentsData, plansData] = await Promise.all([
        lessonsService.listLessons(),
        studentsService.listStudents(),
        plansService.listPlans(),
      ])
      setLessons(lessonsData)
      setStudents(studentsData)
      setPlans(plansData)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar as aulas.'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  function scheduleForStudent(studentId: string, day?: Date) {
    const student = students.find((item) => String(item.id) === studentId)
    return toDatetimeLocalFromDate(
      preferredSlot(student ?? {}, day ?? new Date(), { lockDate: Boolean(day) }),
    )
  }

  function openCreate(day?: Date) {
    if (students.length === 0) {
      navigate('/students')
      return
    }
    setEditing(null)
    setCreateDay(day)
    const studentId = filterStudentId || ''
    const scheduledAt = scheduleForStudent(studentId, day)
    previousStart.current = scheduledAt
    reset({
      studentId,
      planId: '',
      scheduledAt,
      endsAt: addMinutesToDatetimeLocal(scheduledAt, lessonDurationMinutes),
      status: 'scheduled',
      description: '',
    })
    setModalOpen(true)
  }

  function openEdit(lesson: Lesson) {
    setEditing(lesson)
    const scheduledAt = toDatetimeLocalValue(lesson.scheduledAt)
    const endsAt = lesson.endsAt
      ? toDatetimeLocalValue(lesson.endsAt)
      : addMinutesToDatetimeLocal(scheduledAt, lessonDurationMinutes)
    previousStart.current = scheduledAt
    reset({
      studentId: String(lesson.studentId),
      planId: String(lesson.planId),
      scheduledAt,
      endsAt,
      status: lesson.status,
      description: lesson.description ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const payload = {
      studentId: Number(values.studentId),
      planId: Number(values.planId),
      scheduledAt: fromDatetimeLocalValue(values.scheduledAt),
      endsAt: fromDatetimeLocalValue(values.endsAt),
      status: values.status as LessonStatus,
      description: values.description || null,
    }
    try {
      if (editing) {
        await lessonsService.updateLesson(editing.id, payload)
        toast.success('Aula atualizada.')
      } else {
        await lessonsService.createLesson(payload)
        toast.success('Aula agendada.')
      }
      setModalOpen(false)
      await load()
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) setError(field as keyof FormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar a aula.'))
    } finally {
      setSaving(false)
    }
  }

  async function quickStatus(lesson: Lesson, status: LessonStatus) {
    try {
      await lessonsService.updateLesson(lesson.id, { status })
      toast.success('Status atualizado.')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o status.'))
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await lessonsService.deleteLesson(deleting.id)
      toast.success('Aula excluída.')
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível excluir a aula.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  return (
    <div>
      <PageHeader
        description="Agenda de todos os alunos. Clique no dia para marcar."
        actions={
          <>
            <div className="flex rounded-md border border-border bg-surface-raised p-0.5">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === 'list' ? 'bg-accent-soft text-accent' : 'text-ink-muted'
                }`}
              >
                <List className="size-3.5" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === 'calendar' ? 'bg-accent-soft text-accent' : 'text-ink-muted'
                }`}
              >
                <CalendarDays className="size-3.5" />
                Calendário
              </button>
            </div>
            <Button onClick={() => openCreate()}>
              <Plus className="size-4" />
              Nova aula
            </Button>
          </>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Filtrar por aluno"
          value={filterStudentId}
          onChange={(event) => setFilterStudentId(event.target.value)}
          options={[
            { value: '', label: 'Todos os alunos' },
            ...students.map((student) => ({ value: student.id, label: student.name })),
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title="Cadastre um aluno primeiro"
          description="Depois disso você agenda aulas por aqui ou pela ficha do aluno."
          actionLabel="Ver alunos"
          onAction={() => navigate('/students')}
        />
      ) : filteredLessons.length === 0 && view === 'list' ? (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title="Nenhuma aula"
          description="Escolha um aluno no formulário — o filtro acima é só para visualizar."
          actionLabel="Agendar aula"
          onAction={() => openCreate()}
        />
      ) : view === 'list' ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-raised px-4 sm:px-5">
          {filteredLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={{
                ...lesson,
                studentName: lesson.studentName ?? studentsMap.get(lesson.studentId)?.name ?? null,
              }}
              planLabel={labelFor(lesson.planPackage)}
              onComplete={(item) => quickStatus(item, 'done')}
              onNoShow={(item) => quickStatus(item, 'no_show')}
              onCancel={(item) => quickStatus(item, 'cancelled')}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Mês anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <p className="text-sm font-semibold capitalize text-ink">
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Próximo mês">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="px-1 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(88px,1fr)]">
            {calendarDays.map((day) => {
              const dayLessons = filteredLessons.filter((lesson) =>
                isSameDay(parseISO(lesson.scheduledAt), day),
              )
              const inMonth = isSameMonth(day, month)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => openCreate(day)}
                  className={`flex min-h-[88px] flex-col border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent-soft ${
                    inMonth ? 'bg-surface-raised' : 'bg-surface-muted'
                  }`}
                >
                  <span className={`mb-1 text-xs font-medium ${inMonth ? 'text-ink' : 'text-ink-muted'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayLessons.slice(0, 3).map((lesson) => (
                      <span
                        key={lesson.id}
                        role="presentation"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEdit(lesson)
                        }}
                        className="truncate rounded bg-accent-soft px-1 py-0.5 text-[10px] font-medium text-accent"
                      >
                        {formatTimeRange(lesson.scheduledAt, lesson.endsAt)}{' '}
                        {(lesson.studentName ?? studentsMap.get(lesson.studentId)?.name)?.split(' ')[0]}
                      </span>
                    ))}
                    {dayLessons.length > 3 ? (
                      <span className="text-[10px] text-ink-muted">+{dayLessons.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar aula' : 'Nova aula'}
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
            {...register('studentId', {
              onChange: (event) => {
                setValue('planId', '')
                if (editing) return
                const scheduledAt = scheduleForStudent(event.target.value, createDay)
                previousStart.current = scheduledAt
                setValue('scheduledAt', scheduledAt)
                setValue('endsAt', addMinutesToDatetimeLocal(scheduledAt, lessonDurationMinutes))
              },
            })}
          />
          <Select
            label="Pacote"
            placeholder={
              formStudentId ? 'Pacote com vaga' : 'Selecione o aluno antes'
            }
            error={errors.planId?.message}
            options={availablePlans.map((plan) => ({
              value: plan.id,
              label: `${labelFor(plan.package)} · ${plan.lessonsDone}/${plan.lessonsTotal} feitas`,
            }))}
            {...register('planId')}
          />
          {formStudentId && availablePlans.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Este aluno não tem vaga em pacote.{' '}
              <button
                type="button"
                className="font-medium text-accent hover:underline"
                onClick={() => navigate(`/students/${formStudentId}`)}
              >
                Abrir ficha
              </button>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Início"
              type="datetime-local"
              error={errors.scheduledAt?.message}
              {...register('scheduledAt', {
                onChange: (event) => {
                  const next = event.target.value
                  setValue(
                    'endsAt',
                    moveDatetimeLocalKeepingDuration(
                      previousStart.current,
                      getValues('endsAt'),
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
              error={errors.endsAt?.message}
              {...register('endsAt')}
            />
          </div>
          <Select
            label="Status"
            error={errors.status?.message}
            options={[
              { value: 'scheduled', label: 'Agendada' },
              { value: 'done', label: 'Concluída' },
              { value: 'no_show', label: 'Falta' },
              { value: 'cancelled', label: 'Cancelada' },
            ]}
            {...register('status')}
          />
          <TextArea label="Anotações" error={errors.description?.message} {...register('description')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir aula?"
        description="A aula sai do histórico. Se já estava concluída, deixa de contar no pacote."
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
