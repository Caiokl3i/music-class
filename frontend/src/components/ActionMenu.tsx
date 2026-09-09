import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MoreVertical } from 'lucide-react'
import { popoverMotion } from '@/utils/motion'

export type ActionMenuItem = {
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  icon?: ReactNode
}

type ActionMenuProps = {
  items: Array<ActionMenuItem | null | undefined | false>
  label?: string
  align?: 'start' | 'end'
}

export function ActionMenu({ items, label = 'Mais ações', align = 'end' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const visible = items.filter((item): item is ActionMenuItem => Boolean(item))

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (visible.length === 0) return null

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink active:bg-surface-hover"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            role="menu"
            {...popoverMotion}
            className={`absolute top-full z-30 mt-1 min-w-44 origin-top overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-lg shadow-black/10 ${
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            }`}
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm transition-colors disabled:opacity-50 ${
                  item.tone === 'danger'
                    ? 'text-danger hover:bg-danger/10 active:bg-danger/10'
                    : 'text-ink hover:bg-surface-muted active:bg-surface-muted'
                }`}
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.icon ? <span className="[&_svg]:size-4">{item.icon}</span> : null}
                {item.label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
