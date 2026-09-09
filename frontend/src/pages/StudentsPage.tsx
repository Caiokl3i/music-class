import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Phone, Plus, Search, Trash2, TriangleAlert, Users } from 'lucide-react'
import * as studentsService from '@/services/students.service'
import type { Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { StudentLevelBadge } from '@/components/StudentLevelBadge'
import { ActionMenu } from '@/components/ActionMenu'
import { SegmentedControl } from '@/components/SegmentedControl'
import { StudentFormFields, studentFormSchema, type StudentFormValues } from '@/components/StudentFormFields'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { ageFromBirthdate } from '@/utils/format'
import { DEFAULT_STUDENT_COLOR } from '@/domain/student'

type FormValues = StudentFormValues

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
  const [showArchived, setShowArchived] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(studentFormSchema) })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setStudents(await studentsService.listStudents({ archived: showArchived }))
    } catch (error) {
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Não foi possível carregar os alunos.'))
    } finally {
      setLoading(false)
    }
  }, [toast, showArchived])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter((student) => {
      if (!q) return true
      return (
        student.name.toLowerCase().includes(q) ||
        student.instrument.toLowerCase().includes(q) ||
        (student.phone ?? '').includes(q)
      )
    })
  }, [students, query])

  function openCreate() {
    setEditing(null)
    reset({
      name: '',
      instrument: '',
      phone: '',
      birthdate: '',
      description: '',
      level: '',
      color: DEFAULT_STUDENT_COLOR,
      tags: '',
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
      level: student.level ?? '',
      color: student.color ?? DEFAULT_STUDENT_COLOR,
      tags: student.tags ?? '',
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
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nome, instrumento, telefone…"
            className="h-11 w-full rounded-md border border-border bg-surface-raised pr-3 pl-10 text-base text-ink placeholder:text-ink-muted sm:h-10 sm:text-sm"
            aria-label="Buscar alunos"
          />
        </label>
        <SegmentedControl
          label="Situação dos alunos"
          className="w-full sm:w-auto"
          value={showArchived ? 'archived' : 'active'}
          onChange={(next) => setShowArchived(next === 'archived')}
          options={[
            { value: 'active', label: 'Ativos' },
            { value: 'archived', label: 'Arquivados' },
          ]}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<TriangleAlert className="size-8" />}
          title="Não foi possível carregar os alunos"
          description="Confira a conexão e tente de novo."
          actionLabel="Tentar novamente"
          onAction={() => void load()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title={
            query
              ? 'Nenhum aluno encontrado'
              : showArchived
                ? 'Nenhum aluno arquivado'
                : 'Nenhum aluno ainda'
          }
          description={
            query
              ? 'Tente outro termo de busca.'
              : showArchived
                ? 'Alunos arquivados somem da lista principal, mas a ficha continua acessível.'
                : 'Cadastre o primeiro aluno para começar a vender pacotes e agendar aulas.'
          }
          actionLabel={query || showArchived ? undefined : 'Cadastrar aluno'}
          onAction={query || showArchived ? undefined : openCreate}
        />
      ) : (
        <>
          <ul className="animate-fade-in space-y-3 md:hidden">
            {filtered.map((student) => (
              <li key={student.id}>
                <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 active:bg-surface-muted/50">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <Avatar name={student.name} studentId={student.id} color={student.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{student.name}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-muted">{student.instrument}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {student.level ? <StudentLevelBadge level={student.level} /> : null}
                        {creditsCell(student.creditsRemaining)}
                      </div>
                      {student.phone ? (
                        <p className="mt-2 flex items-center gap-1 truncate text-xs text-ink-muted">
                          <Phone className="size-3 shrink-0" aria-hidden />
                          {student.phone}
                        </p>
                      ) : null}
                    </div>
                  </button>
                  <ActionMenu
                    items={[
                      { label: 'Editar', icon: <Pencil />, onClick: () => openEdit(student) },
                      {
                        label: 'Excluir',
                        icon: <Trash2 />,
                        tone: 'danger',
                        onClick: () => setDeleting(student),
                      },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="animate-fade-in hidden overflow-hidden rounded-lg border border-border bg-surface-raised md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-ink-muted">
                  <th className="px-5 py-3 font-medium">Aluno</th>
                  <th className="px-5 py-3 text-center font-medium">Nível</th>
                  <th className="px-5 py-3 text-center font-medium">Instrumento</th>
                  <th className="px-5 py-3 text-center font-medium">Aulas</th>
                  <th className="w-28 px-5 py-3" />
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
                        <Avatar name={student.name} studentId={student.id} color={student.color} />
                        <div className="min-w-0">
                          <Link
                            to={`/students/${student.id}`}
                            className="block truncate font-medium text-ink transition-colors hover:text-accent"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {student.name}
                          </Link>
                          {studentMetaLine(student)}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {student.level ? (
                        <StudentLevelBadge level={student.level} />
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-ink-muted">{student.instrument}</td>
                    <td className="px-5 py-3 text-center">{creditsCell(student.creditsRemaining)}</td>
                    <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Editar"
                          onClick={() => openEdit(student)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-danger hover:bg-danger/10 hover:text-danger"
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
        </>
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
          <StudentFormFields
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir aluno?"
        description={`Tem certeza que deseja excluir ${deleting?.name}? Só é possível excluir alunos sem pacotes e sem aulas.`}
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function studentMetaLine(student: Student) {
  const age = ageFromBirthdate(student.birthdate)
  const tags = tagsPreview(student.tags)
  if (!student.phone && age === null && !tags) return null

  return (
    <p className="flex items-center gap-1 truncate text-xs text-ink-muted">
      {student.phone ? (
        <>
          <Phone className="size-3" aria-hidden />
          {student.phone}
        </>
      ) : null}
      {age !== null ? (
        <span>
          {student.phone ? '· ' : ''}
          {age} anos
        </span>
      ) : null}
      {tags ? (
        <span>
          {student.phone || age !== null ? '· ' : ''}
          {tags}
        </span>
      ) : null}
    </p>
  )
}

function tagsPreview(tags: string | null) {
  if (!tags) return null
  const items = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  if (items.length === 0) return null
  return items.slice(0, 2).join(', ')
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
