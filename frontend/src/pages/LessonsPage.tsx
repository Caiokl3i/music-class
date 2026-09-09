import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Copy, List, Plus, TriangleAlert } from 'lucide-react'
import * as lessonsService from '@/services/lessons.service'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import type { Lesson, LessonStatus, Plan, Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Select } from '@/components/Select'
import { DateTimeField } from '@/components/DateTimeField'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { LessonRow } from '@/components/LessonRow'
import { SegmentedControl } from '@/components/SegmentedControl'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { LessonStatusBadge } from '@/components/StatusBadges'
import { StudentLevelBadge } from '@/components/StudentLevelBadge'
import { studentChipStyle, studentDotStyle } from '@/components/Avatar'
import {
  brazilDateKey,
  brazilTodayParts,
  formatDateTimeRange,
  formatTimeRange,
  formatWeekdayLong,
  fromBrazilWallTime,
  fromDatetimeLocalValue,
  toDatetimeLocalFromDate,
  toDatetimeLocalValue,
} from '@/utils/format'
import {
  addMinutesToDatetimeLocal,
  brazilCalendarDays,
  brazilMonthAnchor,
  brazilWeekAnchor,
  brazilWeekDays,
  moveDatetimeLocalKeepingDuration,
  preferredSlot,
  sameBrazilMonth,
  shiftBrazilMonth,
  shiftBrazilWeek,
} from '@/domain/schedule'
import { bookablePlans } from '@/domain/status'
import { levelLabel } from '@/domain/student'
import { copyText, formatLessonReminder } from '@/domain/reminder'

const schema = z
  .object({
    studentId: z.string().min(1, 'Selecione o aluno'),
    planId: z.string().min(1, 'Selecione o pacote'),
    scheduledAt: z.string().min(1, 'Informe o início'),
    endsAt: z.string().min(1, 'Informe o fim'),
    status: z.enum(['scheduled', 'done', 'cancelled', 'no_show']),
    description: z.string().optional(),
  })
  .refine((values) => values.endsAt > values.scheduledAt, {
    message: 'O fim precisa ser depois do início',
    path: ['endsAt'],
  })

type FormValues = z.infer<typeof schema>
type ViewMode = 'list' | 'week' | 'month'

function brazilWeekLabel(weekDate: Date) {
  const days = brazilWeekDays(weekDate)
  const start = brazilTodayParts(days[0])
  const end = brazilTodayParts(days[6])
  const startLabel = format(new Date(start.year, start.month - 1, start.day), 'd', { locale: ptBR })
  const endLabel = format(new Date(end.year, end.month - 1, end.day), "d 'de' MMMM", { locale: ptBR })
  if (start.month === end.month && start.year === end.year) {
    return `${startLabel}–${endLabel}`
  }
  const startFull = format(new Date(start.year, start.month - 1, start.day), "d 'de' MMM", {
    locale: ptBR,
  })
  return `${startFull} – ${endLabel}`
}

function brazilMonthLabel(monthDate: Date) {
  const parts = brazilTodayParts(monthDate)
  return format(new Date(parts.year, parts.month - 1, 1), 'MMMM yyyy', { locale: ptBR })
}

export function LessonsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { labelFor, lessonDurationMinutes } = useCatalog()
  const previousStart = useRef('')
  const [view, setView] = useState<ViewMode>('week')
  const [month, setMonth] = useState(() => brazilMonthAnchor())
  const [week, setWeek] = useState(() => brazilWeekAnchor())
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [viewing, setViewing] = useState<Lesson | null>(null)
  const [dayMenu, setDayMenu] = useState<Date | null>(null)
  const [dayList, setDayList] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Lesson | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [filterStudentId, setFilterStudentId] = useState('')
  const [createDay, setCreateDay] = useState<Date | undefined>()
  const [selectedDay, setSelectedDay] = useState(() => {
    const parts = brazilTodayParts()
    return fromBrazilWallTime(parts.year, parts.month, parts.day, 12, 0)
  })

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

  const calendarLegend = useMemo(() => {
    const byId = new Map<
      number,
      { id: number; name: string; level: Student['level']; color: string | null }
    >()
    for (const lesson of filteredLessons) {
      if (byId.has(lesson.studentId)) continue
      const fromList = studentsMap.get(lesson.studentId)
      byId.set(lesson.studentId, {
        id: lesson.studentId,
        name:
          lesson.studentName ??
          fromList?.name ??
          `Aluno #${lesson.studentId}`,
        level: lesson.studentLevel ?? fromList?.level ?? null,
        color: lesson.studentColor ?? fromList?.color ?? null,
      })
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [filteredLessons, studentsMap])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
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
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Não foi possível carregar as aulas.'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelectedDay((current) => {
      if (sameBrazilMonth(current, month)) return current
      const today = brazilTodayParts()
      const monthParts = brazilTodayParts(month)
      if (today.year === monthParts.year && today.month === monthParts.month) {
        return fromBrazilWallTime(today.year, today.month, today.day, 12, 0)
      }
      return fromBrazilWallTime(monthParts.year, monthParts.month, 1, 12, 0)
    })
  }, [month])

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
    setViewing(null)
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

  function openDetails(lesson: Lesson) {
    setDayMenu(null)
    setDayList(null)
    setViewing(lesson)
  }

  function openDayMenu(day: Date) {
    setDayMenu(day)
  }

  function openDayList(day: Date) {
    setDayMenu(null)
    setDayList(day)
  }

  function scheduleOnDay(day: Date) {
    setDayMenu(null)
    setDayList(null)
    openCreate(day)
  }

  function lessonsForDay(day: Date) {
    const dayKey = brazilDateKey(day)
    return filteredLessons
      .filter((lesson) => brazilDateKey(lesson.scheduledAt) === dayKey)
      .slice()
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
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

  const calendarDays = useMemo(() => brazilCalendarDays(month), [month])
  const weekDays = useMemo(() => brazilWeekDays(week), [week])
  const visibleCalendarDays = view === 'week' ? weekDays : calendarDays
  const chipLimit = view === 'week' ? 8 : 3

  return (
    <div>
      <PageHeader
        description="Toque na aula para ver detalhes. No calendário, toque no dia para ver as aulas ou agendar."
        actions={
          <>
            <SegmentedControl
              label="Visualização"
              className="w-full sm:w-auto"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'Lista', icon: <List className="size-3.5" /> },
                { value: 'week', label: 'Semana', icon: <CalendarRange className="size-3.5" /> },
                { value: 'month', label: 'Mês', icon: <CalendarDays className="size-3.5" /> },
              ]}
            />
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
            ...students
              .filter((student) => !student.archivedAt)
              .map((student) => ({
              value: student.id,
              label: levelLabel(student.level)
                ? `${student.name} · ${levelLabel(student.level)}`
                : student.name,
            })),
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<TriangleAlert className="size-8" />}
          title="Não foi possível carregar as aulas"
          description="Confira a conexão e tente de novo."
          actionLabel="Tentar novamente"
          onAction={() => void load()}
        />
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
        <ul className="animate-fade-in divide-y divide-border rounded-lg border border-border bg-surface-raised px-4 sm:px-5">
          {filteredLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={{
                ...lesson,
                studentName: lesson.studentName ?? studentsMap.get(lesson.studentId)?.name ?? null,
                studentLevel:
                  lesson.studentLevel ?? studentsMap.get(lesson.studentId)?.level ?? null,
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
        <div className="animate-fade-in overflow-hidden rounded-lg border border-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-4 sm:py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                view === 'week'
                  ? setWeek((current) => shiftBrazilWeek(current, -1))
                  : setMonth((current) => shiftBrazilMonth(current, -1))
              }
              aria-label={view === 'week' ? 'Semana anterior' : 'Mês anterior'}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="text-sm font-semibold capitalize text-ink">
              {view === 'week' ? brazilWeekLabel(week) : brazilMonthLabel(month)}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                view === 'week'
                  ? setWeek((current) => shiftBrazilWeek(current, 1))
                  : setMonth((current) => shiftBrazilMonth(current, 1))
              }
              aria-label={view === 'week' ? 'Próxima semana' : 'Próximo mês'}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {calendarLegend.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2.5">
              {calendarLegend.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-1 text-xs text-ink"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={studentDotStyle(item.color, item.id)}
                    aria-hidden
                  />
                  <span className="font-medium">{item.name.split(' ')[0]}</span>
                  {levelLabel(item.level) ? (
                    <span className="text-ink-muted">· {levelLabel(item.level)}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          {view === 'week' ? (
            <div className="divide-y divide-border md:hidden">
              {weekDays.map((day) => {
                const dayLessons = lessonsForDay(day)
                return (
                  <section key={brazilDateKey(day) ?? day.toISOString()} className="px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold capitalize text-ink">
                          {formatWeekdayLong(day).split(',')[0]}
                        </p>
                        <p className="text-xs text-ink-muted">{formatWeekdayLong(day).split(', ')[1]}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => scheduleOnDay(day)}>
                        Agendar
                      </Button>
                    </div>
                    {dayLessons.length === 0 ? (
                      <p className="text-sm text-ink-muted">Nenhuma aula</p>
                    ) : (
                      <ul className="space-y-2">
                        {dayLessons.map((lesson) => (
                          <li key={lesson.id}>
                            <button
                              type="button"
                              onClick={() => openDetails(lesson)}
                              className="w-full truncate rounded-md px-3 py-2.5 text-left text-sm font-semibold"
                              style={studentChipStyle(
                                lesson.studentColor ?? studentsMap.get(lesson.studentId)?.color,
                                lesson.studentId,
                              )}
                            >
                              {formatTimeRange(lesson.scheduledAt, lesson.endsAt)}{' '}
                              {(lesson.studentName ?? studentsMap.get(lesson.studentId)?.name)?.split(' ')[0]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="md:hidden">
              <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                  <div key={`${day}-${index}`} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dayKey = brazilDateKey(day)
                  const dayLessons = lessonsForDay(day)
                  const inMonth = sameBrazilMonth(day, month)
                  const selected = brazilDateKey(selectedDay) === dayKey
                  const todayPartsNow = brazilTodayParts()
                  const todayKey = brazilDateKey(
                    fromBrazilWallTime(todayPartsNow.year, todayPartsNow.month, todayPartsNow.day, 12, 0),
                  )
                  return (
                    <button
                      key={dayKey ?? day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`flex min-h-12 flex-col items-center justify-center gap-1 py-1.5 ${
                        selected
                          ? 'bg-accent-soft'
                          : inMonth
                            ? 'bg-surface-raised active:bg-surface-muted'
                            : 'bg-surface-muted'
                      }`}
                    >
                      <span
                        className={`flex size-7 items-center justify-center rounded-full text-sm font-medium ${
                          selected
                            ? 'bg-accent text-white'
                            : dayKey === todayKey
                              ? 'text-accent'
                              : inMonth
                                ? 'text-ink'
                                : 'text-ink-muted'
                        }`}
                      >
                        {brazilTodayParts(day).day}
                      </span>
                      <span className="flex h-1.5 items-center justify-center gap-0.5">
                        {dayLessons.slice(0, 3).map((lesson) => (
                          <span
                            key={lesson.id}
                            className="size-1.5 rounded-full"
                            style={studentDotStyle(
                              lesson.studentColor ?? studentsMap.get(lesson.studentId)?.color,
                              lesson.studentId,
                            )}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-border px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {formatWeekdayLong(selectedDay)}
                  </p>
                  <Button size="sm" onClick={() => scheduleOnDay(selectedDay)}>
                    Agendar
                  </Button>
                </div>
                {lessonsForDay(selectedDay).length === 0 ? (
                  <p className="text-sm text-ink-muted">Nenhuma aula neste dia.</p>
                ) : (
                  <ul className="space-y-2">
                    {lessonsForDay(selectedDay).map((lesson) => (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => openDetails(lesson)}
                          className="w-full truncate rounded-md px-3 py-2.5 text-left text-sm font-semibold"
                          style={studentChipStyle(
                            lesson.studentColor ?? studentsMap.get(lesson.studentId)?.color,
                            lesson.studentId,
                          )}
                        >
                          {formatTimeRange(lesson.scheduledAt, lesson.endsAt)}{' '}
                          {(lesson.studentName ?? studentsMap.get(lesson.studentId)?.name)?.split(' ')[0]}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="px-1 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div
              className={`grid grid-cols-7 ${
                view === 'week' ? 'auto-rows-[minmax(160px,1fr)]' : 'auto-rows-[minmax(88px,1fr)]'
              }`}
            >
              {visibleCalendarDays.map((day) => {
                const dayKey = brazilDateKey(day)
                const dayLessons = filteredLessons.filter(
                  (lesson) => brazilDateKey(lesson.scheduledAt) === dayKey,
                )
                const inMonth = view === 'week' || sameBrazilMonth(day, month)
                return (
                  <div
                    key={dayKey ?? day.toISOString()}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDayMenu(day)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openDayMenu(day)
                      }
                    }}
                    className={`flex cursor-pointer flex-col border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent-soft active:bg-accent-soft ${
                      view === 'week' ? 'min-h-[160px]' : 'min-h-[88px]'
                    } ${inMonth ? 'bg-surface-raised' : 'bg-surface-muted'}`}
                  >
                    <span className={`mb-1 text-xs font-medium ${inMonth ? 'text-ink' : 'text-ink-muted'}`}>
                      {brazilTodayParts(day).day}
                    </span>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayLessons.slice(0, chipLimit).map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDetails(lesson)
                          }}
                          className={`truncate rounded px-1.5 py-0.5 text-left font-semibold ${
                            view === 'week' ? 'text-[11px]' : 'text-[10px]'
                          }`}
                          style={studentChipStyle(
                            lesson.studentColor ?? studentsMap.get(lesson.studentId)?.color,
                            lesson.studentId,
                          )}
                        >
                          {formatTimeRange(lesson.scheduledAt, lesson.endsAt)}{' '}
                          {(lesson.studentName ?? studentsMap.get(lesson.studentId)?.name)?.split(' ')[0]}
                        </button>
                      ))}
                      {dayLessons.length > chipLimit ? (
                        <button
                          type="button"
                          className="text-left text-[10px] text-ink-muted transition-opacity hover:opacity-80"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDayList(day)
                          }}
                        >
                          +{dayLessons.length - chipLimit} ver todas
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
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
            options={students
              .filter((student) => !student.archivedAt || String(student.id) === formStudentId)
              .map((student) => ({
              value: student.id,
              label: levelLabel(student.level)
                ? `${student.name} · ${levelLabel(student.level)}`
                : student.name,
            }))}
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
                className="font-medium text-accent transition-opacity hover:opacity-80"
                onClick={() => navigate(`/students/${formStudentId}`)}
              >
                Abrir ficha
              </button>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField
              label="Início"
              value={watch('scheduledAt')}
              error={errors.scheduledAt?.message}
              onChange={(next) => {
                setValue('scheduledAt', next, { shouldValidate: true })
                setValue(
                  'endsAt',
                  moveDatetimeLocalKeepingDuration(
                    previousStart.current,
                    getValues('endsAt'),
                    next,
                    lessonDurationMinutes,
                  ),
                  { shouldValidate: true },
                )
                previousStart.current = next
              }}
            />
            <DateTimeField
              label="Fim"
              hint="Padrão: 1 hora"
              value={watch('endsAt')}
              error={errors.endsAt?.message}
              onChange={(next) => setValue('endsAt', next, { shouldValidate: true })}
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

      <Modal
        open={Boolean(dayMenu)}
        title={dayMenu ? formatWeekdayLong(dayMenu) : 'Dia'}
        onClose={() => setDayMenu(null)}
        footer={
          <Button variant="secondary" onClick={() => setDayMenu(null)}>
            Fechar
          </Button>
        }
      >
        {dayMenu ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              {lessonsForDay(dayMenu).length === 0
                ? 'Nenhuma aula neste dia ainda.'
                : `${lessonsForDay(dayMenu).length} aula(s) neste dia.`}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                className="justify-start"
                disabled={lessonsForDay(dayMenu).length === 0}
                onClick={() => openDayList(dayMenu)}
              >
                Ver aulas do dia
              </Button>
              <Button className="justify-start" onClick={() => scheduleOnDay(dayMenu)}>
                Agendar aula neste dia
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(dayList)}
        title={dayList ? `Aulas · ${formatWeekdayLong(dayList)}` : 'Aulas do dia'}
        onClose={() => setDayList(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDayList(null)}>
              Fechar
            </Button>
            {dayList ? (
              <Button onClick={() => scheduleOnDay(dayList)}>Agendar neste dia</Button>
            ) : null}
          </>
        }
      >
        {dayList ? (
          lessonsForDay(dayList).length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula neste dia.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lessonsForDay(dayList).map((lesson) => {
                const name =
                  lesson.studentName ??
                  studentsMap.get(lesson.studentId)?.name ??
                  `Aluno #${lesson.studentId}`
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 py-3 text-left transition-opacity hover:opacity-80"
                      onClick={() => openDetails(lesson)}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">
                          {formatTimeRange(lesson.scheduledAt, lesson.endsAt)} · {name}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-muted">
                          {labelFor(lesson.planPackage)}
                        </span>
                      </span>
                      <LessonStatusBadge status={lesson.status} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        ) : null}
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title="Detalhes da aula"
        onClose={() => setViewing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Fechar
            </Button>
            {viewing ? (
              <Button
                variant="secondary"
                onClick={() => {
                  void copyText(formatLessonReminder(viewing))
                    .then(() => toast.success('Lembrete copiado.'))
                    .catch(() => toast.error('Não foi possível copiar.'))
                }}
              >
                <Copy className="size-4" aria-hidden />
                Copiar lembrete
              </Button>
            ) : null}
            {viewing ? (
              <Button
                onClick={() => {
                  const lesson = viewing
                  openEdit(lesson)
                }}
              >
                Editar aula
              </Button>
            ) : null}
          </>
        }
      >
        {viewing ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted">Horário</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {formatDateTimeRange(viewing.scheduledAt, viewing.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Aluno</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-ink">
                <button
                  type="button"
                  className="font-medium text-accent transition-opacity hover:opacity-80"
                  onClick={() => navigate(`/students/${viewing.studentId}`)}
                >
                  {viewing.studentName ??
                    studentsMap.get(viewing.studentId)?.name ??
                    `Aluno #${viewing.studentId}`}
                </button>
                <StudentLevelBadge
                  level={viewing.studentLevel ?? studentsMap.get(viewing.studentId)?.level}
                />
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="mt-0.5">
                <LessonStatusBadge status={viewing.status} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pacote</dt>
              <dd className="mt-0.5 text-ink">{labelFor(viewing.planPackage)}</dd>
            </div>
            {viewing.description ? (
              <div>
                <dt className="text-ink-muted">Anotações</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-ink">{viewing.description}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
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
