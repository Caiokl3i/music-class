import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import * as studentsService from '@/services/students.service'
import { WEEKDAY_OPTIONS } from '@/domain/schedule'
import type { Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'

const schema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  instrument: z.string().min(1, 'Informe o instrumento'),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  description: z.string().optional(),
  preferredWeekday: z.string().optional(),
  preferredTime: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StudentsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStudents(await studentsService.listStudents())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar os alunos.'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) ||
        student.instrument.toLowerCase().includes(q) ||
        (student.phone ?? '').includes(q),
    )
  }, [students, query])

  function openCreate() {
    setEditing(null)
    reset({
      name: '',
      instrument: '',
      phone: '',
      birthdate: '',
      description: '',
      preferredWeekday: '',
      preferredTime: '',
    })
    setModalOpen(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    reset({
      name: student.name,
      instrument: student.instrument,
      phone: student.phone ?? '',
      birthdate: student.birthdate?.slice(0, 10) ?? '',
      description: student.description ?? '',
      preferredWeekday: student.preferredWeekday ? String(student.preferredWeekday) : '',
      preferredTime: student.preferredTime ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const payload = studentsService.studentFormPayload(values)
    try {
      if (editing) {
        await studentsService.updateStudent(editing.id, payload)
        toast.success('Aluno atualizado.')
        setModalOpen(false)
        await load()
      } else {
        const created = await studentsService.createStudent(payload)
        toast.success('Aluno cadastrado.')
        setModalOpen(false)
        navigate(`/students/${created.id}`)
      }
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) setError(field as keyof FormValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o aluno.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await studentsService.deleteStudent(deleting.id)
      toast.success('Aluno excluído.')
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível excluir o aluno.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        description="Abra a ficha para vender pacote e agendar."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            Novo aluno
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nome, instrumento, telefone…"
            className="h-10 w-full rounded-md border border-border bg-surface-raised pr-3 pl-10 text-sm text-ink placeholder:text-ink-muted"
            aria-label="Buscar alunos"
          />
        </label>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title={query ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}
          description={
            query
              ? 'Tente outro termo de busca.'
              : 'Cadastre o primeiro aluno para começar a vender pacotes e agendar aulas.'
          }
          actionLabel={query ? undefined : 'Cadastrar aluno'}
          onAction={query ? undefined : openCreate}
        />
      ) : (
        <div className="animate-fade-in overflow-hidden rounded-lg border border-border bg-surface-raised">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-ink-muted">
                <th className="px-5 py-3 font-medium">Aluno</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Instrumento</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Aulas</th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  className="table-row-hover cursor-pointer border-b border-border last:border-0"
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} />
                      <div className="min-w-0">
                        <Link
                          to={`/students/${student.id}`}
                          className="block truncate font-medium text-ink hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {student.name}
                        </Link>
                        {student.phone ? (
                          <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
                            <Phone className="size-3" aria-hidden />
                            {student.phone}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-muted md:hidden">{student.instrument}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-ink-muted md:table-cell">
                    {student.instrument}
                  </td>
                  <td className="hidden px-5 py-3 md:table-cell">
                    {creditsCell(student.creditsRemaining)}
                  </td>
                  <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Editar"
                        onClick={() => openEdit(student)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label="Excluir"
                        onClick={() => setDeleting(student)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar aluno' : 'Novo aluno'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Fechar
            </Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Input label="Instrumento" error={errors.instrument?.message} {...register('instrument')} />
          <Input label="Telefone" error={errors.phone?.message} {...register('phone')} />
          <Input
            label="Data de nascimento"
            type="date"
            error={errors.birthdate?.message}
            {...register('birthdate')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Dia da aula"
              error={errors.preferredWeekday?.message}
              options={[
                { value: '', label: 'Qualquer dia' },
                ...WEEKDAY_OPTIONS.map((day) => ({
                  value: String(day.value),
                  label: day.label,
                })),
              ]}
              {...register('preferredWeekday')}
            />
            <Input
              label="Horário"
              type="time"
              hint="Padrão 14:00"
              error={errors.preferredTime?.message}
              {...register('preferredTime')}
            />
          </div>
          <TextArea label="Observações" error={errors.description?.message} {...register('description')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir aluno?"
        description={`Tem certeza que deseja excluir ${deleting?.name}? Pacotes e aulas vinculados também serão removidos.`}
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function creditsCell(remaining: number) {
  if (remaining <= 0) {
    return <span className="text-sm text-ink-muted">Nenhuma a fazer</span>
  }
  if (remaining === 1) {
    return (
      <span className="text-sm">
        <span className="font-medium text-warning">1</span>
        <span className="text-ink-muted"> a fazer</span>
        <span className="ml-1 text-xs text-warning">acabando</span>
      </span>
    )
  }
  return (
    <span className="text-sm">
      <span className="font-medium text-accent">{remaining}</span>
      <span className="text-ink-muted"> a fazer</span>
    </span>
  )
}
