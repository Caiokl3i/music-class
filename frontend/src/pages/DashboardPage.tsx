import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, CircleDollarSign, Clock, TriangleAlert } from 'lucide-react'
import * as dashboardService from '@/services/dashboard.service'
import * as lessonsService from '@/services/lessons.service'
import type { Dashboard, Lesson, LessonStatus, PlanAlert, PlanPackage } from '@/types/api'
import { PageHeader, SectionHeader } from '@/components/Card'
import { Skeleton } from '@/components/Skeleton'
import { LessonRow } from '@/components/LessonRow'
import { LessonStatusBadge } from '@/components/StatusBadges'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/format'

export function DashboardPage() {
  const { user } = useAuth()
  const { labelFor } = useCatalog()
  const toast = useToast()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <PageHeader
        title={`Olá, ${greeting}`}
        description={data ? leadText(data) : 'O que precisa da sua atenção hoje.'}
      />

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <LoadedDashboard data={data} labelFor={labelFor} onStatus={setStatus} />
      )}
    </div>
  )
}

function LoadedDashboard({
  data,
  labelFor,
  onStatus,
}: {
  data: Dashboard
  labelFor: (value: PlanPackage | null | undefined) => string
  onStatus: (lesson: Lesson, status: LessonStatus) => Promise<void>
}) {
  const unpaid = data.unpaidPlans ?? []
  const lastLessons = data.lowCredits ?? []
  const expiring = data.expiringSoon ?? []
  const expired = data.expiredPlans ?? []
  const hasMoneyOrPacks = unpaid.length + lastLessons.length + expiring.length + expired.length > 0

  return (
    <>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-4">
        <Metric label="Alunos" value={String(data.studentCount)} delay={0} />
        <Metric
          label="Hoje"
          value={String(data.today.length)}
          hint={
            data.overdue.length
              ? `${data.overdue.length} atrasada(s)`
              : data.scheduledCount
                ? `${data.scheduledCount} na agenda`
                : undefined
          }
          delay={0.04}
        />
        <Metric
          label="A receber"
          value={formatCurrency(data.pendingAmount)}
          hint={data.pendingPlans ? `${data.pendingPlans} pacote(s)` : 'Em dia'}
          delay={0.08}
        />
        <Metric
          label="Este mês"
          value={formatCurrency(data.revenueThisMonth ?? data.revenue)}
          hint={data.doneCount ? `${data.doneCount} aula(s) feitas` : undefined}
          delay={0.12}
        />
      </div>

      {data.overdue.length > 0 ? (
        <section className="mt-10">
          <SectionHeader
            title="Atrasadas"
            description="Passaram da data e ainda estão agendadas."
          />
          <ul>
            {data.overdue.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                planLabel={labelFor(lesson.planPackage)}
                onComplete={(item) => onStatus(item, 'done')}
                onNoShow={(item) => onStatus(item, 'no_show')}
                onCancel={(item) => onStatus(item, 'cancelled')}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {hasMoneyOrPacks ? (
        <section className="mt-10">
          <SectionHeader
            title="Atenção"
            description="Receber, renovar ou validade do pacote."
          />
          <ul className="space-y-4">
            {unpaid.map((item) => (
              <AlertRow
                key={`unpaid-${item.planId}`}
                item={item}
                icon={<CircleDollarSign className="size-4 shrink-0 text-warning" />}
                note={unpaidNote(item)}
                meta={formatCurrency(item.price)}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {lastLessons.map((item) => (
              <AlertRow
                key={`low-${item.planId}`}
                item={item}
                icon={<TriangleAlert className="size-4 shrink-0 text-warning" />}
                note="Resta 1 aula. Combine o próximo pacote."
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {expiring.map((item) => (
              <AlertRow
                key={`soon-${item.planId}`}
                item={item}
                icon={<Clock className="size-4 shrink-0 text-warning" />}
                note={`Vence em ${formatDateTime(item.expiresAt)}`}
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
            {expired.map((item) => (
              <AlertRow
                key={`expired-${item.planId}`}
                item={item}
                icon={<TriangleAlert className="size-4 shrink-0 text-warning" />}
                note={`${item.lessonsRemaining} aula(s) a fazer, validade encerrada.`}
                meta={`${item.lessonsRemaining}/${item.lessonsTotal}`}
                packageLabel={labelFor(item.package)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Hoje"
            actions={
              <Link to="/lessons" className="inline-flex items-center gap-1 text-sm text-link hover:underline">
                Agenda <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {data.today.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhuma aula hoje.
              {data.upcoming[0]
                ? ` Próxima: ${data.upcoming[0].studentName ?? 'aluno'} · ${formatDateTime(data.upcoming[0].scheduledAt)}.`
                : ''}
            </p>
          ) : (
            <ul>
              {data.today.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  planLabel={labelFor(lesson.planPackage)}
                  onComplete={(item) => onStatus(item, 'done')}
                  onNoShow={(item) => onStatus(item, 'no_show')}
                  onCancel={(item) => onStatus(item, 'cancelled')}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeader title="Próximas" />
          {data.upcoming.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada agendado depois de hoje.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcoming.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      <Link
                        to={`/students/${lesson.studentId}`}
                        className="text-link hover:underline"
                      >
                        {lesson.studentName ?? `Aluno #${lesson.studentId}`}
                      </Link>
                    </p>
                    <p className="text-xs text-ink-muted">{formatDateTime(lesson.scheduledAt)}</p>
                  </div>
                  <LessonStatusBadge status={lesson.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10">
        <SectionHeader
          title="Atividade recente"
          description="Últimas aulas concluídas ou com falta."
          actions={
            <Link to="/students" className="inline-flex items-center gap-1 text-sm text-link hover:underline">
              Alunos <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {data.recent.length === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há aulas concluídas ou faltas.</p>
        ) : (
          <ul className="space-y-3">
            {data.recent.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    <Link
                      to={`/students/${lesson.studentId}`}
                      className="text-link hover:underline"
                    >
                      {lesson.studentName ?? `Aluno #${lesson.studentId}`}
                    </Link>
                  </p>
                  <p className="text-xs text-ink-muted">{formatDateTime(lesson.scheduledAt)}</p>
                </div>
                <LessonStatusBadge status={lesson.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function leadText(data: Dashboard) {
  if (data.overdue.length) {
    return `${data.overdue.length} aula(s) atrasada(s) pedem registro.`
  }
  if (data.pendingAmount) {
    return `${formatCurrency(data.pendingAmount)} a receber.`
  }
  if (data.today.length) {
    return `${data.today.length} aula(s) hoje.`
  }
  if (data.upcoming[0]) {
    return `Próxima: ${data.upcoming[0].studentName ?? 'aluno'} · ${formatDateTime(data.upcoming[0].scheduledAt)}.`
  }
  return 'Nada urgente hoje.'
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
    <li className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5">
        {icon}
        <div>
          <Link to={`/students/${item.studentId}`} className="text-sm font-medium text-link hover:underline">
            {item.studentName ?? `Aluno #${item.studentId}`}
          </Link>
          <p className="text-xs text-ink-muted">
            {packageLabel} · {note}
          </p>
        </div>
      </div>
      <p className="shrink-0 text-xs tabular-nums text-ink-muted">{meta}</p>
    </li>
  )
}

function Metric({
  label,
  value,
  hint,
  delay,
}: {
  label: string
  value: string
  hint?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </motion.div>
  )
}
