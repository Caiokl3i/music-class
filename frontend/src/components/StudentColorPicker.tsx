import {
  STUDENT_COLOR_OPTIONS,
  STUDENT_DOT,
  type StudentColorTone,
} from '@/domain/student'

type StudentColorPickerProps = {
  value: StudentColorTone
  onChange: (value: StudentColorTone) => void
  error?: string
}

export function StudentColorPicker({ value, onChange, error }: StudentColorPickerProps) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">Cor no calendário</legend>
      <div className="flex flex-wrap gap-2">
        {STUDENT_COLOR_OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                selected
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface-raised text-ink-muted hover:border-accent/40 hover:text-ink'
              }`}
              aria-pressed={selected}
            >
              <span className={`size-3.5 rounded-full ${STUDENT_DOT[option.value]}`} aria-hidden />
              {option.label}
            </button>
          )
        })}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
