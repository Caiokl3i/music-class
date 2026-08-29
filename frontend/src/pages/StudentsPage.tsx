import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { ChevronRight, Plus, Search, Users } from 'lucide-react'
import * as studentsService from '@/services/students.service'
import type { Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
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
    reset({ name: '', instrument: '', phone: '', birthdate: '', description: '' })
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
    })
    setModalOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const payload = {
      name: values.name,
      instrument: values.instrument,
      phone: values.phone || null,
      birthdate: values.birthdate || null,
      description: values.description || null,
    }
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
        title="Alunos"
        description="Abra a ficha para vender pacote e agendar. A lista é só o índice."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Novo aluno
          </Button>
        }
      />

      <div className="mb-4">
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, instrumento…"
            className="h-10 w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted"
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
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem] items-center gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-muted md:grid">
            <span>Nome</span>
            <span className="text-center">Instrumento</span>
            <span className="text-center">Aulas</span>
            <span className="text-right">Ações</span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((student, index) => (
              <motion.li
                key={student.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.2) }}
                className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-soft md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem] md:gap-4"
                onClick={() => navigate(`/students/${student.id}`)}
              >
                <div className="min-w-0">
                  <Link
                    to={`/students/${student.id}`}
                    className="inline-flex max-w-full items-center gap-1 font-medium text-link hover:underline"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="truncate">{student.name}</span>
                    <ChevronRight className="size-4 shrink-0" aria-hidden />
                  </Link>
                  {student.phone ? (
                    <p className="truncate text-xs text-ink-muted">{student.phone}</p>
                  ) : null}
                </div>
                <p className="text-sm text-ink md:text-center">{student.instrument}</p>
                <div className="md:text-center">{creditsCell(student.creditsRemaining)}</div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEdit(student)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation()
                      setDeleting(student)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </motion.li>
            ))}
          </ul>
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
        <span className="font-medium text-warning-on-soft">1</span>
        <span className="text-ink-muted"> a fazer</span>
        <span className="ml-1 text-xs text-warning-on-soft">acabando</span>
      </span>
    )
  }
  return (
    <span className="text-sm">
      <span className="font-medium text-link">{remaining}</span>
      <span className="text-ink-muted"> a fazer</span>
    </span>
  )
}
