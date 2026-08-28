import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Users, Package, CalendarDays, Wallet, ArrowRight } from 'lucide-react'
import * as dashboardService from '@/services/dashboard.service'
import * as lessonsService from '@/services/lessons.service'
import type { Dashboard, Lesson, LessonStatus } from '@/types/api'
import { PageHeader, Card, SectionHeader } from '@/components/Card'
import { CardSkeleton } from '@/components/Skeleton'
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
        description="O que precisa da sua atenção hoje."
      />

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<Users className="size-4" />} label="Alunos" value={String(data.studentCount)} delay={0} />
            <StatCard
              icon={<Package className="size-4" />}
              label="Pacotes ativos"
              value={String(data.activePlans)}
              hint={data.pendingPlans ? `${data.pendingPlans} pendente(s)` : undefined}
              delay={0.04}
            />
            <StatCard
              icon={<CalendarDays className="size-4" />}
              label="Aulas agendadas"
              value={String(data.scheduledCount)}
              hint={`${data.doneCount} concluídas`}
              delay={0.08}
            />
            <StatCard
              icon={<Wallet className="size-4" />}
              label="Receita acumulada"
              value={formatCurrency(data.revenue)}
              hint={
                data.pendingAmount
                  ? `${formatCurrency(data.pendingAmount)} a receber`
                  : undefined
              }
              delay={0.12}
            />
          </div>

          {data.overdue.length > 0 ? (
            <Card className="mt-6 border-amber-200 bg-amber-50/60">
              <SectionHeader
                title="Atrasadas"
                description="Aulas que passaram da data e ainda estão agendadas."
              />
              <ul className="divide-y divide-amber-200/80">
                {data.overdue.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    planLabel={labelFor(lesson.planPackage)}
                    onComplete={(item) => setStatus(item, 'done')}
                    onNoShow={(item) => setStatus(item, 'no_show')}
                    onCancel={(item) => setStatus(item, 'cancelled')}
                  />
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader
                title="Hoje"
                actions={
                  <Link to="/lessons" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
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
                <ul className="divide-y divide-border">
                  {data.today.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      planLabel={labelFor(lesson.planPackage)}
                      onComplete={(item) => setStatus(item, 'done')}
                      onNoShow={(item) => setStatus(item, 'no_show')}
                      onCancel={(item) => setStatus(item, 'cancelled')}
                    />
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionHeader title="Próximas" />
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-ink-muted">Nada agendado depois de hoje.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.upcoming.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          <Link
                            to={`/students/${lesson.studentId}`}
                            className="text-brand-700 hover:underline"
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
            </Card>
          </div>

          <Card className="mt-4">
            <SectionHeader
              title="Atividade recente"
              description="Últimas aulas concluídas ou com falta."
              actions={
                <Link to="/students" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
                  Alunos <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {data.recent.length === 0 ? (
              <p className="text-sm text-ink-muted">Ainda não há aulas concluídas ou faltas.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        <Link
                          to={`/students/${lesson.studentId}`}
                          className="text-brand-700 hover:underline"
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
          </Card>
        </>
      )}
    </div>
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
  hint?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Card>
        <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          {icon}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
        {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
      </Card>
    </motion.div>
  )
}
