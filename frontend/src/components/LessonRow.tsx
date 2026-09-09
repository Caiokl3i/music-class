import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { ActionMenu } from '@/components/ActionMenu'
import { LessonStatusBadge } from '@/components/StatusBadges'
import { StudentLevelBadge } from '@/components/StudentLevelBadge'
import { formatDateTimeRange } from '@/utils/format'
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
  const menuItems = [
    scheduled && onNoShow ? { label: 'Falta', onClick: () => onNoShow(lesson) } : null,
    scheduled && onCancel ? { label: 'Cancelar', onClick: () => onCancel(lesson) } : null,
    onEdit ? { label: 'Editar', icon: <Pencil />, onClick: () => onEdit(lesson) } : null,
    onDelete
      ? { label: 'Excluir', icon: <Trash2 />, tone: 'danger' as const, onClick: () => onDelete(lesson) }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">
            {formatDateTimeRange(lesson.scheduledAt, lesson.endsAt)}
          </p>
          <LessonStatusBadge status={lesson.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          {showStudent ? (
            <Link to={`/students/${lesson.studentId}`} className="font-medium text-accent transition-opacity hover:opacity-80">
              {name}
            </Link>
          ) : null}
          {showStudent ? <StudentLevelBadge level={lesson.studentLevel} /> : null}
          {showStudent && planLabel ? <span>· {planLabel}</span> : planLabel ? <span>{planLabel}</span> : null}
        </p>
        {lesson.description ? <p className="mt-1 text-sm text-ink">{lesson.description}</p> : null}
      </div>
      <div className="hidden flex-wrap gap-2 sm:flex">
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
      <div className="flex items-center gap-2 sm:hidden">
        {scheduled && onComplete ? (
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onComplete(lesson)}>
            Concluir
          </Button>
        ) : null}
        <ActionMenu items={menuItems} />
      </div>
    </li>
  )
}
