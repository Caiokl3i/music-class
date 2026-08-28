import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { motion } from 'motion/react'
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
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatDateTime, fromDatetimeLocalValue, toDatetimeLocalValue } from '@/utils/format'
import { PACKAGES } from '@/utils/packages'

const schema = z.object({
  studentId: z.string().min(1, 'Selecione o aluno'),
  planId: z.string().min(1, 'Selecione o pacote'),
  scheduledAt: z.string().min(1, 'Informe data e hora'),
  status: z.enum(['scheduled', 'done', 'cancelled', 'no_show']),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type ViewMode = 'list' | 'calendar'

export function LessonsPage() {
  const toast = useToast()
  const [view, setView] = useState<ViewMode>('list')
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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      planId: '',
      scheduledAt: '',
      status: 'scheduled',
      description: '',
    },
  })

  const formStudentId = watch('studentId')

  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const plansMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])

  const availablePlans = useMemo(() => {
    const studentId = Number(formStudentId)
    if (!studentId) return []
    return plans.filter(
      (plan) =>
        plan.studentId === studentId &&
        plan.status !== 'cancelled' &&
        (editing?.planId === plan.id || plan.lessonsRemaining > 0),
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

  function openCreate(day?: Date) {
    setEditing(null)
    const base = day ?? new Date()
    base.setHours(14, 0, 0, 0)
    reset({
      studentId: filterStudentId || '',
      planId: '',
      scheduledAt: toDatetimeLocalValue(base.toISOString()),
      status: 'scheduled',
      description: '',
    })
    setModalOpen(true)
  }

  function openEdit(lesson: Lesson) {
    setEditing(lesson)
    reset({
      studentId: String(lesson.studentId),
      planId: String(lesson.planId),
      scheduledAt: toDatetimeLocalValue(lesson.scheduledAt),
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
        if (field in values) {
          setError(field as keyof FormValues, { message })
        }
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
        title="Aulas"
        description="Agende, acompanhe e atualize o status das aulas."
        actions={
          <>
            <div className="flex rounded-lg border border-border bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-muted'
                }`}
              >
                <List className="size-3.5" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView('calendar')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  view === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-ink-muted'
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
      ) : filteredLessons.length === 0 && view === 'list' ? (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title="Nenhuma aula"
          description="Agende a primeira aula vinculando um pacote com créditos disponíveis."
          actionLabel="Agendar aula"
          onAction={() => openCreate()}
        />
      ) : view === 'list' ? (
        <ul className="space-y-3">
          {filteredLessons.map((lesson, index) => {
            const student = studentsMap.get(lesson.studentId)
            const plan = plansMap.get(lesson.planId)
            return (
              <motion.li
                key={lesson.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.2) }}
                className="rounded-2xl border border-border bg-white p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{formatDateTime(lesson.scheduledAt)}</h3>
                      <LessonBadge status={lesson.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {student?.name ?? `Aluno #${lesson.studentId}`}
                      {plan ? ` · ${PACKAGES[plan.package].label}` : ''}
                    </p>
                    {lesson.description ? (
                      <p className="mt-2 text-sm text-ink">{lesson.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lesson.status === 'scheduled' ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => quickStatus(lesson, 'done')}>
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => quickStatus(lesson, 'no_show')}
                        >
                          Falta
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => quickStatus(lesson, 'cancelled')}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => openEdit(lesson)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(lesson)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
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
          <div className="grid grid-cols-7 border-b border-border bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
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
                  className={`flex min-h-[88px] flex-col border-b border-r border-border p-1.5 text-left transition-colors hover:bg-brand-50/40 ${
                    inMonth ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <span
                    className={`mb-1 text-xs font-medium ${
                      inMonth ? 'text-ink' : 'text-slate-400'
                    }`}
                  >
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
                        className="truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] font-medium text-brand-800"
                      >
                        {format(parseISO(lesson.scheduledAt), 'HH:mm')}{' '}
                        {studentsMap.get(lesson.studentId)?.name?.split(' ')[0]}
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
              Cancelar
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
              onChange: () => setValue('planId', ''),
            })}
          />
          <Select
            label="Pacote"
            placeholder={formStudentId ? 'Selecione um pacote com crédito' : 'Selecione o aluno antes'}
            error={errors.planId?.message}
            options={availablePlans.map((plan) => ({
              value: plan.id,
              label: `${PACKAGES[plan.package].label} · ${plan.lessonsRemaining}/${plan.lessonsTotal} créditos`,
            }))}
            {...register('planId')}
          />
          <Input
            label="Data e hora"
            type="datetime-local"
            error={errors.scheduledAt?.message}
            {...register('scheduledAt')}
          />
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
          <TextArea
            label="Anotações"
            error={errors.description?.message}
            {...register('description')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir aula?"
        description="Esta ação remove a aula permanentemente. Se ela consumia crédito, o crédito volta ao excluir (aulas canceladas já não consomem)."
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function LessonBadge({ status }: { status: LessonStatus }) {
  const map = {
    scheduled: { label: 'Agendada', tone: 'brand' as const },
    done: { label: 'Concluída', tone: 'success' as const },
    cancelled: { label: 'Cancelada', tone: 'neutral' as const },
    no_show: { label: 'Falta', tone: 'warning' as const },
  }
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>
}
