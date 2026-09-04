import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { brazilTodayParts } from '@/utils/format'
import { popoverMotion } from '@/utils/motion'

type FieldKind = 'datetime' | 'date' | 'time' | 'month'

type DateTimeFieldProps = {
  label: string
  kind?: FieldKind
  value?: string
  error?: string
  hint?: string
  disabled?: boolean
  name?: string
  onChange?: (value: string) => void
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number }

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function parseValue(value: string | undefined, kind: FieldKind): Parts | null {
  if (!value) return null
  if (kind === 'time') {
    const match = /^(\d{2}):(\d{2})/.exec(value)
    if (!match) return null
    const today = brazilTodayParts()
    return { year: today.year, month: today.month, day: today.day, hour: Number(match[1]), minute: Number(match[2]) }
  }
  if (kind === 'month') {
    const match = /^(\d{4})-(\d{2})/.exec(value)
    if (!match) return null
    return { year: Number(match[1]), month: Number(match[2]), day: 1, hour: 0, minute: 0 }
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
  }
}

function serialize(parts: Parts, kind: FieldKind) {
  if (kind === 'time') return `${pad2(parts.hour)}:${pad2(parts.minute)}`
  if (kind === 'month') return `${parts.year}-${pad2(parts.month)}`
  if (kind === 'date') return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`
}

function formatDisplay(value: string | undefined, kind: FieldKind) {
  const parts = parseValue(value, kind)
  if (!parts) return ''
  if (kind === 'time') return `${pad2(parts.hour)}:${pad2(parts.minute)}`
  if (kind === 'month') {
    return format(new Date(parts.year, parts.month - 1, 1), 'MMMM yyyy', { locale: ptBR })
  }
  const date = `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`
  if (kind === 'date') return date
  return `${date} ${pad2(parts.hour)}:${pad2(parts.minute)}`
}

function placeholderFor(kind: FieldKind) {
  if (kind === 'time') return 'HH:mm'
  if (kind === 'month') return 'mês/ano'
  if (kind === 'date') return 'dd/mm/aaaa'
  return 'dd/mm/aaaa HH:mm'
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function monthGrid(year: number, month: number) {
  const leading = new Date(year, month - 1, 1).getDay()
  const total = daysInMonth(year, month)
  const cells: Array<{ day: number; inMonth: boolean } | null> = []
  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (let day = 1; day <= total; day += 1) cells.push({ day, inMonth: true })
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function todayParts(): Parts {
  const now = brazilTodayParts()
  return {
    year: now.year,
    month: now.month,
    day: now.day,
    hour: now.hour,
    minute: Math.floor(now.minute / 5) * 5,
  }
}

export function DateTimeField({
  label,
  kind = 'datetime',
  value = '',
  error,
  hint,
  disabled,
  name,
  onChange,
}: DateTimeFieldProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const selected = parseValue(value, kind)
  const [cursor, setCursor] = useState(() => selected ?? todayParts())

  useEffect(() => {
    if (open) setCursor(selected ?? todayParts())
  }, [open, value])

  useEffect(() => {
    if (!open) return

    function place() {
      const anchor = rootRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = kind === 'datetime' ? 360 : kind === 'time' ? 220 : 288
      const left = Math.min(rect.left, window.innerWidth - width - 12)
      const below = rect.bottom + 8
      const top = below + 340 > window.innerHeight ? Math.max(12, rect.top - 348) : below
      setPanelStyle({
        position: 'fixed',
        top,
        left: Math.max(12, left),
        width,
        zIndex: 70,
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, kind])

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor.year, cursor.month])
  const today = todayParts()
  const display = formatDisplay(value, kind)
  const showCalendar = kind === 'datetime' || kind === 'date'
  const showMonth = kind === 'month'
  const showTime = kind === 'datetime' || kind === 'time'

  function commit(next: Parts) {
    onChange?.(serialize(next, kind))
    if (kind === 'date' || kind === 'month') setOpen(false)
  }

  function pickDay(day: number) {
    commit({ ...cursor, day, hour: selected?.hour ?? cursor.hour, minute: selected?.minute ?? cursor.minute })
  }

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <button
        id={inputId}
        type="button"
        name={name}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center rounded-md border bg-surface-raised px-3 text-left text-sm transition-colors ${
          error ? 'border-danger' : 'border-border focus:border-accent'
        } ${display ? 'text-ink' : 'text-ink-muted'} disabled:opacity-60`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
      >
        {display || placeholderFor(kind)}
      </button>
      {hint && !error ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={panelRef}
              style={panelStyle}
              {...popoverMotion}
              className="rounded-lg border border-border bg-surface-raised p-3 shadow-lg shadow-black/10"
              role="dialog"
              aria-label={label}
            >
              <div className={showCalendar && showTime ? 'grid gap-3 sm:grid-cols-[1fr_auto]' : ''}>
                {showMonth ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                      onClick={() =>
                        setCursor((current) =>
                          current.month === 1
                            ? { ...current, year: current.year - 1, month: 12 }
                            : { ...current, month: current.month - 1 },
                        )
                      }
                      aria-label="Mês anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-3 py-2 text-sm font-semibold capitalize text-ink transition-colors hover:bg-accent-soft hover:text-accent"
                      onClick={() => {
                        commit({ ...cursor, day: 1 })
                        setOpen(false)
                      }}
                    >
                      {format(new Date(cursor.year, cursor.month - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                      onClick={() =>
                        setCursor((current) =>
                          current.month === 12
                            ? { ...current, year: current.year + 1, month: 1 }
                            : { ...current, month: current.month + 1 },
                        )
                      }
                      aria-label="Próximo mês"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : null}
                {showCalendar ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                        onClick={() =>
                          setCursor((current) =>
                            current.month === 1
                              ? { ...current, year: current.year - 1, month: 12 }
                              : { ...current, month: current.month - 1 },
                          )
                        }
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <p className="text-sm font-semibold capitalize text-ink">
                        {format(new Date(cursor.year, cursor.month - 1, 1), 'MMMM yyyy', { locale: ptBR })}
                      </p>
                      <button
                        type="button"
                        className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                        onClick={() =>
                          setCursor((current) =>
                            current.month === 12
                              ? { ...current, year: current.year + 1, month: 1 }
                              : { ...current, month: current.month + 1 },
                          )
                        }
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                    <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      {WEEKDAYS.map((day) => (
                        <div key={day} className="py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {grid.map((cell, index) => {
                        if (!cell) {
                          return <div key={`empty-${index}`} className="h-8" />
                        }
                        const isSelected =
                          selected &&
                          selected.year === cursor.year &&
                          selected.month === cursor.month &&
                          selected.day === cell.day
                        const isToday =
                          today.year === cursor.year && today.month === cursor.month && today.day === cell.day
                        return (
                          <button
                            key={`${cursor.year}-${cursor.month}-${cell.day}`}
                            type="button"
                            onClick={() => pickDay(cell.day)}
                            className={`h-8 rounded-md text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-accent text-white'
                                : isToday
                                  ? 'bg-accent-soft text-accent'
                                  : 'text-ink hover:bg-surface-hover'
                            }`}
                          >
                            {cell.day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {showTime ? (
                  <div className="flex gap-2">
                    <TimeColumn
                      label="Hora"
                      values={HOURS}
                      selected={selected?.hour ?? cursor.hour}
                      onSelect={(hour) =>
                        commit({
                          ...(selected ?? cursor),
                          hour,
                          minute: selected?.minute ?? cursor.minute,
                        })
                      }
                    />
                    <TimeColumn
                      label="Min"
                      values={MINUTES}
                      selected={selected?.minute ?? cursor.minute}
                      onSelect={(minute) =>
                        commit({
                          ...(selected ?? cursor),
                          hour: selected?.hour ?? cursor.hour,
                          minute,
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                <button
                  type="button"
                  className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                  onClick={() => {
                    onChange?.('')
                    setOpen(false)
                  }}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-accent transition-opacity hover:opacity-80"
                  onClick={() => {
                    commit(todayParts())
                    setOpen(false)
                  }}
                >
                  Hoje
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

function TimeColumn({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string
  values: number[]
  selected: number
  onSelect: (value: number) => void
}) {
  return (
    <div className="w-16">
      <p className="mb-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="max-h-48 overflow-auto rounded-md border border-border">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`flex h-8 w-full items-center justify-center text-xs ${
              selected === value ? 'bg-accent text-white' : 'text-ink hover:bg-surface-hover'
            }`}
          >
            {pad2(value)}
          </button>
        ))}
      </div>
    </div>
  )
}
