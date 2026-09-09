import { AnimatePresence, motion } from 'motion/react'
import { overlayMotion, panelMotion } from '@/utils/motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-overlay"
            {...overlayMotion}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            {...panelMotion}
            className={`relative z-10 flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-lg border border-border bg-surface-raised shadow-xl shadow-black/10 sm:max-h-[90dvh] sm:rounded-lg ${
              size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
              <h2 id="modal-title" className="min-w-0 truncate text-lg font-semibold text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink active:bg-surface-hover"
                aria-label="Fechar modal"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
            {footer ? (
              <div className="safe-bottom flex flex-col gap-2 border-t border-border px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-5 [&>button]:w-full sm:[&>button]:w-auto">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
