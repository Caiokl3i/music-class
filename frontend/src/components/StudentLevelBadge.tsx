import { Badge } from '@/components/Badge'
import { levelBadgeTone, levelLabel, type StudentLevel } from '@/domain/student'

export function StudentLevelBadge({ level }: { level: StudentLevel }) {
  const label = levelLabel(level)
  if (!label) return null
  return <Badge tone={levelBadgeTone(level)}>{label}</Badge>
}
