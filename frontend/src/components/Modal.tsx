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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
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
            className={`relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xl shadow-black/10 ${
              size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id="modal-title" className="text-lg font-semibold text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                aria-label="Fechar modal"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
