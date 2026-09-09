import { useEffect, useRef, useState } from 'react'
import {
  STUDENT_COLOR_PRESETS,
  isHexColor,
  resolveStudentHex,
} from '@/domain/student'

type StudentColorPickerProps = {
  value: string
  onChange: (value: string) => void
  error?: string
}

const COMMIT_MS = 120

function normalizeHex(next: string) {
  const normalized = next.startsWith('#') ? next : `#${next}`
  return isHexColor(normalized) ? normalized.toLowerCase() : null
}

/**
 * Mantém preview local enquanto a paleta nativa dispara muitos eventos;
 * só propaga para o formulário com debounce (ou imediato em preset/blur).
 */
export function StudentColorPicker({ value, onChange, error }: StudentColorPickerProps) {
  const external = resolveStudentHex(value)
  const [preview, setPreview] = useState(external)
  const draggingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef(preview)

  useEffect(() => {
    if (!draggingRef.current) {
      latestRef.current = external
      setPreview(external)
    }
  }, [external])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function propagate(hex: string) {
    if (hex === resolveStudentHex(value)) return
    onChange(hex)
  }

  function commit(next: string, mode: 'live' | 'final') {
    const hex = normalizeHex(next)
    if (!hex) return

    latestRef.current = hex
    setPreview(hex)

    if (mode === 'final') {
      draggingRef.current = false
      clearTimer()
      propagate(hex)
      return
    }

    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      propagate(latestRef.current)
    }, COMMIT_MS)
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">Cor no calendário</legend>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 transition-colors hover:border-accent/40">
          <span
            className="size-8 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: preview }}
            aria-hidden
          />
          <span className="text-sm text-ink">
            <span className="font-medium">Escolher cor</span>
            <span className="mt-0.5 block font-mono text-xs text-ink-muted uppercase">{preview}</span>
          </span>
          <input
            type="color"
            value={preview}
            onPointerDown={() => {
              draggingRef.current = true
            }}
            onInput={(event) => commit(event.currentTarget.value, 'live')}
            onChange={(event) => commit(event.currentTarget.value, 'live')}
            onBlur={() => commit(latestRef.current, 'final')}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Abrir paleta de cores"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {STUDENT_COLOR_PRESETS.map((preset) => {
            const selected = preview === preset.toLowerCase()
            return (
              <button
                key={preset}
                type="button"
                title={preset}
                aria-label={`Usar cor ${preset}`}
                aria-pressed={selected}
                onClick={() => commit(preset, 'final')}
                className={`size-7 rounded-full border transition-transform ${
                  selected
                    ? 'scale-110 border-ink ring-2 ring-accent/40'
                    : 'border-black/10 hover:scale-105'
                }`}
                style={{ backgroundColor: preset }}
              />
            )
          })}
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-ink-muted">
          A cor aparece no avatar e nas aulas do calendário.
        </p>
      )}
    </fieldset>
  )
}
