import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Download,
  CircleDollarSign,
  Clock,
  CreditCard,
  TrendingUp,
  TriangleAlert,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import * as dashboardService from '@/services/dashboard.service'
import * as lessonsService from '@/services/lessons.service'
import type { Dashboard, Lesson, LessonStatus, PlanAlert, PlanPackage } from '@/types/api'
import { Card, PageHeader, SectionHeader } from '@/components/Card'
import { Avatar } from '@/components/Avatar'
import { Skeleton } from '@/components/Skeleton'
import { Button } from '@/components/Button'
import { LESSON_STATUS } from '@/domain/status'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage } from '@/utils/errors'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateTimeRange,
  formatTimeRange,
  formatWeekdayLong,
} from '@/utils/format'

export function DashboardPage() {
  const { user } = useAuth()
  const { labelFor } = useCatalog()
  const toast = useToast()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [month, setMonth] = useState(() => currentMonthValue())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await dashboardService.getDashboard(Intl.DateTimeFormat().resolvedOptions().timeZone),
      )
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar o painel.'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(lesson: Lesson, status: LessonStatus) {
    try {
      await lessonsService.updateLesson(lesson.id, { status })
      toast.success('Status atualizado.')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o status.'))
    }
  }

  const greeting = user?.fullName?.split(' ')[0] || 'Professor'
  const today = formatWeekdayLong(new Date())

  async function exportMonth() {
    setExporting(true)
    try {
      await dashboardService.downloadMonthCsv(
        month,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )
      toast.success('CSV do mês baixado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível exportar o mês.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        description={`Olá, ${greeting}. Resumo das suas aulas de hoje.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-sm text-ink">
              <CalendarDays className="size-4 text-ink-muted" aria-hidden />
              <span className="sr-only">Mês do CSV</span>
              <input
                id="export-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="bg-transparent text-sm text-ink outline-none"
              />
            </label>
            <Button
              id="export-csv"
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={() => void exportMonth()}
            >
              <Download />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <LoadedDashboard
          data={data}
          today={today}
          labelFor={labelFor}
          onStatus={setStatus}
        />
      )}
    </div>
  )
}

function LoadedDashboard({
  data,
  today,
  labelFor,
  onStatus,
}: {
  data: Dashboard
  today: string
  labelFor: (value: PlanPackage | null | undefined) => string
  onStatus: (lesson: Lesson, status: LessonStatus) => Promise<void>
}) {
  const unpaid = data.unpaidPlans ?? []
  const lastLessons = data.lowCredits ?? []
  const expiring = data.expiringSoon ?? []
  const expired = data.expiredPlans ?? []
  const hasAlerts = unpaid.length + lastLessons.length + expiring.length + expired.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="size-5" />}
          label="Alunos"
          value={String(data.studentCount)}
          hint="Total de alunos"
          delay={0}
        />
        <StatCard
          icon={<CalendarDays className="size-5" />}
          label="Hoje"
          value={String(data.today.length)}
          hint="aulas agendadas"
          delay={0.04}
        />
        <StatCard
          icon={<CreditCard className="size-5" />}
          label="A receber"
          value={formatCurrency(data.pendingAmount)}
          hint={data.pendingPlans ? `${data.pendingPlans} pacote(s)` : 'em dia'}
          delay={0.08}
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="Este mês"
          value={formatCurrency(data.revenueThisMonth ?? data.revenue)}
          hint={`${data.doneCount} aula(s) feitas`}
          delay={0.12}
        />
      </div>

      {data.overdue.length > 0 ? (
        <Card>
          <SectionHeader
            icon={<Clock className="size-4" />}
            title="Aulas atrasadas"
            description="Passaram da data e ainda estão agendadas."
          />
          <ul className="divide-y divide-border">
            {data.overdue.map((lesson) => (
              <LessonListRow
                key={lesson.id}
                lesson={lesson}
                planLabel={labelFor(lesson.planPackage)}
                onStatus={onStatus}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      {hasAlerts ? (
        <Card>
          <SectionHeader
            icon={<TriangleAlert className="size-4" />}
            title="Pacotes que pedem atenção"
            description="Receber, renovar ou validade acabando."
          />
          <ul className="divide-y divide-border">
            {unpaid.map((item) => (
              <AlertRow
                key={`unpaid-${item.planId}`}
                item={item}
                icon={<CircleDollarSign className="size-4" />}
                note={unpaidNote(item)}
                meta={formatCurrency(item.price)}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {lastLessons.map((item) => (
              <AlertRow
                key={`low-${item.planId}`}
                item={item}
                icon={<TriangleAlert className="size-4" />}
                note="Resta 1 aula. Combine o próximo pacote."
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {expiring.map((item) => (
              <AlertRow
                key={`soon-${item.planId}`}
                item={item}
                icon={<Clock className="size-4" />}
                note={`Vence em ${formatDateTime(item.expiresAt)}`}
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {expired.map((item) => (
              <AlertRow
                key={`expired-${item.planId}`}
                item={item}
                icon={<TriangleAlert className="size-4" />}
                note={`${item.lessonsRemaining} aula(s) a fazer, validade encerrada.`}
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader
            icon={<CalendarDays className="size-5" />}
            title="Hoje"
            description={today}
            actions={
              <Link
                to="/lessons"
                className="text-sm font-medium text-accent hover:underline"
              >
                Ver agenda <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {data.today.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-muted/40 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <CalendarCheck className="size-7" aria-hidden />
              </div>
              <p className="text-sm font-medium text-ink">Nenhuma aula hoje.</p>
              <p className="mt-1 text-xs text-ink-muted">
                Aproveite para planejar as próximas aulas!
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.today.map((lesson) => (
                <LessonListRow
                  key={lesson.id}
                  lesson={lesson}
                  planLabel={labelFor(lesson.planPackage)}
                  onStatus={onStatus}
                />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader
            icon={<CalendarClock className="size-4" />}
            title="Próximas aulas"
            description="Próximos compromissos agendados"
          />
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada agendado depois de hoje.</p>
          ) : (
            <>
              <ul className="divide-y divide-border border-t border-border">
                {data.upcoming.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-3 py-3">
                    <Avatar name={lesson.studentName} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/students/${lesson.studentId}`}
                        className="block truncate text-sm font-medium text-ink hover:underline"
                      >
                        {lesson.studentName ?? `Aluno #${lesson.studentId}`}
                      </Link>
                      <p className="truncate text-xs text-ink-muted">
                        {lesson.studentInstrument ?? labelFor(lesson.planPackage)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs tabular-nums text-ink-muted">
                      <p>{formatDate(lesson.scheduledAt)}</p>
                      <p>{formatTimeRange(lesson.scheduledAt, lesson.endsAt)}</p>
                    </div>
                    <StatusPill status={lesson.status} />
                  </li>
                ))}
              </ul>
              <Link
                to="/lessons"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Ver todas as aulas <ArrowRight className="size-4" />
              </Link>
            </>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader
          icon={<Zap className="size-4" />}
          title="Atividade recente"
          description="Últimas aulas concluídas ou com falta"
          actions={
            <Link
              to="/students"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Ver todos os alunos <ArrowRight className="size-4" />
            </Link>
          }
        />
        {data.recent.length === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há aulas concluídas ou faltas.</p>
        ) : (
          <ul className="space-y-1">
            {data.recent.map((lesson) => (
              <li
                key={lesson.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-2.5 md:grid-cols-[auto_1.2fr_1fr_1.4fr_auto]"
              >
                <ActivityIcon status={lesson.status} />
                <Link
                  to={`/students/${lesson.studentId}`}
                  className="block truncate text-sm font-medium text-ink hover:underline"
                >
                  {lesson.studentName ?? `Aluno #${lesson.studentId}`}
                </Link>
                <p className="col-start-2 truncate text-xs text-ink-muted md:col-start-auto md:text-sm">
                  {lesson.studentInstrument ?? labelFor(lesson.planPackage)}
                </p>
                <p className="col-start-2 flex items-center gap-2 text-xs text-ink-muted md:col-start-auto md:text-sm">
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                  {formatDateTimeRange(lesson.scheduledAt, lesson.endsAt)}
                </p>
                <div className="col-start-3 row-start-1 justify-self-end md:col-start-auto md:row-start-auto">
                  <StatusPill status={lesson.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function unpaidNote(item: PlanAlert) {
  if (item.lessonsRemaining === 0) {
    return 'Aulas feitas. Falta receber.'
  }
  if (item.lessonsRemaining === 1) {
    return 'Falta receber. Resta 1 aula.'
  }
  return 'Pacote ainda sem pagamento.'
}

function AlertRow({
  item,
  icon,
  note,
  meta,
  packageLabel,
}: {
  item: PlanAlert
  icon: ReactNode
  note: string
  meta: string
  packageLabel: string
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/students/${item.studentId}`}
          className="block truncate text-sm font-medium text-ink hover:underline"
        >
          {item.studentName ?? `Aluno #${item.studentId}`}
        </Link>
        <p className="truncate text-xs text-ink-muted">
          {packageLabel} · {note}
        </p>
      </div>
      <p className="shrink-0 text-xs tabular-nums text-ink-muted">{meta}</p>
    </li>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  delay,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="stat-card animate-fade-in"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-sm text-ink-muted">{hint}</p>
        </div>
        <span className="rounded-lg bg-accent-soft p-3 text-accent" aria-hidden>
          {icon}
        </span>
      </div>
    </motion.div>
  )
}

const PILL_TONES: Record<LessonStatus, string> = {
  scheduled: 'bg-accent-soft text-accent',
  done: 'bg-success/10 text-success',
  no_show: 'bg-warning/10 text-warning',
  cancelled: 'bg-surface-muted text-ink-muted',
}

function StatusPill({ status }: { status: LessonStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${PILL_TONES[status]}`}
    >
      {LESSON_STATUS[status].label}
    </span>
  )
}

function ActivityIcon({ status }: { status: LessonStatus }) {
  const done = status === 'done'
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-full ${
        done ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
      }`}
      aria-hidden
    >
      {done ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
    </span>
  )
}

function LessonListRow({
  lesson,
  planLabel,
  onStatus,
}: {
  lesson: Lesson
  planLabel: string
  onStatus: (lesson: Lesson, status: LessonStatus) => Promise<void>
}) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-3">
      <Avatar name={lesson.studentName} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/students/${lesson.studentId}`}
          className="block truncate text-sm font-medium text-ink hover:underline"
        >
          {lesson.studentName ?? `Aluno #${lesson.studentId}`}
        </Link>
        <p className="truncate text-xs text-ink-muted">
          {lesson.studentInstrument ?? planLabel} ·{' '}
          {formatDateTimeRange(lesson.scheduledAt, lesson.endsAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => onStatus(lesson, 'done')}>
          Concluir
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onStatus(lesson, 'no_show')}>
          Falta
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onStatus(lesson, 'cancelled')}>
          Cancelar
        </Button>
      </div>
    </li>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-7 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
              <Skeleton className="size-11 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-56 rounded-lg" />
    </div>
  )
}
