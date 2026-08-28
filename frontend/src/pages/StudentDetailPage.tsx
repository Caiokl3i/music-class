import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as studentsService from '@/services/students.service'
import * as plansService from '@/services/plans.service'
import * as lessonsService from '@/services/lessons.service'
import type { Lesson, Plan, Student } from '@/types/api'
import { PageHeader, Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/utils/errors'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'
import { PACKAGES } from '@/utils/packages'

export function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [student, setStudent] = useState<Student | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const studentId = Number(id)
    if (!studentId) {
      navigate('/students')
      return
    }
    setLoading(true)
    try {
      const [studentData, plansData, lessonsData] = await Promise.all([
        studentsService.getStudent(studentId),
        plansService.listPlans(studentId),
        lessonsService.listLessons({ studentId }),
      ])
      setStudent(studentData)
      setPlans(plansData)
      setLessons(lessonsData)
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
        Voltar
      </Button>
      <PageHeader
        title={student.name}
        description={`${student.instrument}${student.phone ? ` · ${student.phone}` : ''}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(`/plans?studentId=${student.id}`)}>
            Ver pacotes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-ink">Detalhes</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-ink-muted">Nascimento</dt>
              <dd className="font-medium">{formatDate(student.birthdate)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Observações</dt>
              <dd className="font-medium whitespace-pre-wrap">
                {student.description || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Pacotes</h2>
            <Link to={`/plans?studentId=${student.id}`} className="text-sm text-brand-700 hover:underline">
              Gerenciar
            </Link>
          </div>
          {plans.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum pacote para este aluno.</p>
          ) : (
            <ul className="divide-y divide-border">
              {plans.map((plan) => (
                <li key={plan.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-ink">{PACKAGES[plan.package].label}</p>
                    <p className="text-xs text-ink-muted">
                      {plan.lessonsRemaining}/{plan.lessonsTotal} créditos ·{' '}
                      {formatCurrency(Number(plan.price))}
                    </p>
                  </div>
                  <PlanStatusBadge status={plan.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold text-ink">Aulas</h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma aula registrada.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lessons.slice(0, 10).map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium text-ink">{formatDateTime(lesson.scheduledAt)}</p>
                    <p className="text-xs text-ink-muted">{lesson.description || 'Sem anotações'}</p>
                  </div>
                  <LessonStatusBadge status={lesson.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function PlanStatusBadge({ status }: { status: Plan['status'] }) {
  const map = {
    pending: { label: 'Pendente', tone: 'warning' as const },
    paid: { label: 'Pago', tone: 'success' as const },
    cancelled: { label: 'Cancelado', tone: 'danger' as const },
  }
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>
}

function LessonStatusBadge({ status }: { status: Lesson['status'] }) {
  const map = {
    scheduled: { label: 'Agendada', tone: 'brand' as const },
    done: { label: 'Concluída', tone: 'success' as const },
    cancelled: { label: 'Cancelada', tone: 'neutral' as const },
    no_show: { label: 'Falta', tone: 'warning' as const },
  }
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>
}
