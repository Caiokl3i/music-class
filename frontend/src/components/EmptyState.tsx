import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/Button'
import { fadeInMotion } from '@/utils/motion'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <motion.div
      {...fadeInMotion}
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-raised px-6 py-16 text-center"
    >
      {icon ? <div className="mb-4 text-accent">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  )
}
