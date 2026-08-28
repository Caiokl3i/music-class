import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Users, Package, CalendarDays, Wallet, ArrowRight } from 'lucide-react'
import { parseISO } from 'date-fns'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import * as lessonsService from '@/services/lessons.service'
import type { Lesson, Plan, Student } from '@/types/api'
import { PageHeader, Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { CardSkeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/utils/errors'
import { formatCurrency, formatDateTime } from '@/utils/format'

export function DashboardPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsData, plansData, lessonsData] = await Promise.all([
        studentsService.listStudents(),
        plansService.listPlans(),
        lessonsService.listLessons(),
      ])
      setStudents(studentsData)
      setPlans(plansData)
      setLessons(lessonsData)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar o painel.'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const stats = useMemo(() => {
    const now = new Date()
    const activePlans = plans.filter((p) => p.status === 'paid' && p.lessonsRemaining > 0)
    const revenue = plans
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.price), 0)
    const upcoming = lessons
      .filter((l) => l.status === 'scheduled' && parseISO(l.scheduledAt) >= now)
      .slice()
      .sort((a, b) => parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime())
      .slice(0, 5)
    const recent = lessons
      .filter((l) => l.status === 'done' || l.status === 'no_show')
      .slice()
      .reverse()
      .slice(0, 5)
    const scheduledCount = lessons.filter((l) => l.status === 'scheduled').length
    const doneCount = lessons.filter((l) => l.status === 'done').length

    return {
      studentCount: students.length,
      activePlans: activePlans.length,
      revenue,
      upcoming,
      recent,
      scheduledCount,
      doneCount,
    }
  }, [students, plans, lessons])

  const greeting = user?.fullName?.split(' ')[0] || 'Professor'

  return (
    <div>
      <PageHeader
        title={`Olá, ${greeting}`}
        description="Resumo do seu estúdio de aulas particulares."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Users className="size-4" />}
              label="Alunos"
              value={String(stats.studentCount)}
              delay={0}
            />
            <StatCard
              icon={<Package className="size-4" />}
              label="Pacotes ativos"
              value={String(stats.activePlans)}
              delay={0.04}
            />
            <StatCard
              icon={<CalendarDays className="size-4" />}
              label="Aulas agendadas"
              value={String(stats.scheduledCount)}
              hint={`${stats.doneCount} concluídas`}
              delay={0.08}
            />
            <StatCard
              icon={<Wallet className="size-4" />}
              label="Receita (pagos)"
              value={formatCurrency(stats.revenue)}
              delay={0.12}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Próximas aulas</h2>
                <Link to="/lessons" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
                  Ver todas <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {stats.upcoming.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhuma aula futura agendada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.upcoming.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {studentsMap.get(lesson.studentId)?.name ?? `Aluno #${lesson.studentId}`}
                        </p>
                        <p className="text-xs text-ink-muted">{formatDateTime(lesson.scheduledAt)}</p>
                      </div>
                      <Badge tone="brand">Agendada</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Atividade recente</h2>
                <Link to="/students" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
                  Alunos <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {stats.recent.length === 0 ? (
                <p className="text-sm text-ink-muted">Ainda não há aulas concluídas ou faltas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.recent.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {studentsMap.get(lesson.studentId)?.name ?? `Aluno #${lesson.studentId}`}
                        </p>
                        <p className="text-xs text-ink-muted">{formatDateTime(lesson.scheduledAt)}</p>
                      </div>
                      <Badge tone={lesson.status === 'done' ? 'success' : 'warning'}>
                        {lesson.status === 'done' ? 'Concluída' : 'Falta'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
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
