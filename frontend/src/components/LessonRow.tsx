import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { LessonStatusBadge } from '@/components/StatusBadges'
import { formatDateTime } from '@/utils/format'
import type { Lesson } from '@/types/api'

type LessonRowProps = {
  lesson: Lesson
  planLabel?: string
  showStudent?: boolean
  onComplete?: (lesson: Lesson) => void
  onNoShow?: (lesson: Lesson) => void
  onCancel?: (lesson: Lesson) => void
  onEdit?: (lesson: Lesson) => void
  onDelete?: (lesson: Lesson) => void
}

export function LessonRow({
  lesson,
  planLabel,
  showStudent = true,
  onComplete,
  onNoShow,
  onCancel,
  onEdit,
  onDelete,
}: LessonRowProps) {
  const name = lesson.studentName ?? `Aluno #${lesson.studentId}`
  const scheduled = lesson.status === 'scheduled'

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{formatDateTime(lesson.scheduledAt)}</p>
          <LessonStatusBadge status={lesson.status} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {showStudent ? (
            <Link to={`/students/${lesson.studentId}`} className="font-medium text-brand-700 hover:underline">
              {name}
            </Link>
          ) : null}
          {showStudent && planLabel ? ' · ' : null}
          {planLabel}
        </p>
        {lesson.description ? <p className="mt-1 text-sm text-ink">{lesson.description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
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
            Editar
          </Button>
        ) : null}
        {onDelete ? (
          <Button size="sm" variant="ghost" onClick={() => onDelete(lesson)}>
            Excluir
          </Button>
        ) : null}
      </div>
    </li>
  )
}
