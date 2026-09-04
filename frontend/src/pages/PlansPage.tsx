import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { BookOpen, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import * as plansService from '@/services/plans.service'
import * as planTypesService from '@/services/plan-types.service'
import * as studentsService from '@/services/students.service'
import type { PackageOption, PlanPackage, PlanStatus, Student } from '@/types/api'
import { PageHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { TextArea } from '@/components/TextArea'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { useToast } from '@/contexts/ToastContext'
import { useCatalog } from '@/contexts/CatalogContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatCurrency } from '@/utils/format'
import { levelLabel } from '@/domain/student'

const sellSchema = z.object({
  studentId: z.string().min(1, 'Selecione o aluno'),
  package: z.string().min(1, 'Selecione o pacote'),
  status: z.enum(['pending', 'paid', 'cancelled']),
  notes: z.string().optional(),
})

const typeSchema = z.object({
  label: z.string().trim().min(1, 'Informe o nome'),
  lessons: z.coerce.number().int().min(1, 'Informe ao menos 1 aula').max(100),
  price: z.coerce.number().min(0, 'Informe o preço'),
})

type SellValues = z.infer<typeof sellSchema>
type TypeValues = z.infer<typeof typeSchema>

export function PlansPage() {
  const toast = useToast()
  const { packages, optionFor, creditValidityDays, loading: catalogLoading, reload } = useCatalog()
  const [students, setStudents] = useState<Student[]>([])
  const [sellOpen, setSellOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [editingType, setEditingType] = useState<PackageOption | null>(null)
  const [deletingType, setDeletingType] = useState<PackageOption | null>(null)
  const [savingSell, setSavingSell] = useState(false)
  const [savingType, setSavingType] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sellForm = useForm<SellValues>({
    resolver: zodResolver(sellSchema),
    defaultValues: { package: packages[0]?.value ?? '', status: 'paid', studentId: '', notes: '' },
  })

  const typeForm = useForm<TypeValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: { label: '', lessons: 4, price: 130 },
  })

  const selectedPackage = sellForm.watch('package') as PlanPackage

  const loadStudents = useCallback(async () => {
    try {
      setStudents(await studentsService.listStudents())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível carregar os alunos.'))
    }
  }, [toast])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  function openSell(pack?: PlanPackage) {
    sellForm.reset({
      studentId: '',
      package: pack ?? packages[0]?.value ?? '',
      status: 'paid',
      notes: '',
    })
    setSellOpen(true)
  }

  function openCreateType() {
    setEditingType(null)
    typeForm.reset({ label: '', lessons: 4, price: 130 })
    setTypeOpen(true)
  }

  function openEditType(item: PackageOption) {
    setEditingType(item)
    typeForm.reset({
      label: item.label,
      lessons: item.lessons,
      price: item.price,
    })
    setTypeOpen(true)
  }

  async function onSell(values: SellValues) {
    setSavingSell(true)
    try {
      await plansService.createPlan({
        studentId: Number(values.studentId),
        package: values.package,
        status: values.status as PlanStatus,
        notes: values.notes || null,
      })
      toast.success('Pacote vendido.')
      setSellOpen(false)
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) sellForm.setError(field as keyof SellValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o pacote.'))
    } finally {
      setSavingSell(false)
    }
  }

  async function onSaveType(values: TypeValues) {
    setSavingType(true)
    try {
      if (editingType?.id) {
        await planTypesService.updatePlanType(editingType.id, values)
        toast.success('Tipo de pacote atualizado.')
      } else {
        await planTypesService.createPlanType(values)
        toast.success('Tipo de pacote criado.')
      }
      setTypeOpen(false)
      await reload()
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) typeForm.setError(field as keyof TypeValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível salvar o tipo de pacote.'))
    } finally {
      setSavingType(false)
    }
  }

  async function onDeleteType() {
    if (!deletingType?.id) return
    setDeleting(true)
    try {
      await planTypesService.deletePlanType(deletingType.id)
      toast.success('Tipo de pacote excluído.')
      setDeletingType(null)
      await reload()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível excluir o tipo de pacote.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        description="Monte o catálogo do estúdio. Preço e aulas da venda ficam gravados no pacote do aluno."
        actions={
          <>
            <Button variant="secondary" onClick={openCreateType}>
              <Plus />
              Novo tipo
            </Button>
            <Button onClick={() => openSell()} disabled={packages.length === 0}>
              <Plus />
              Vender pacote
            </Button>
          </>
        }
      />

      {catalogLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="Nenhum tipo de pacote"
          description="Crie o primeiro tipo — avulsa, mensal ou o formato que você cobra."
          actionLabel="Novo tipo"
          onAction={openCreateType}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((item, index) => {
            const perLesson = item.lessons > 0 ? item.price / item.lessons : 0
            return (
              <motion.li
                key={item.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.04 }}
                className="stat-card flex flex-col"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    {item.lessons === 1 ? (
                      <BookOpen className="size-5" aria-hidden />
                    ) : (
                      <Package className="size-5" aria-hidden />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditType(item)}
                      aria-label={`Editar ${item.label}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => setDeletingType(item)}
                      aria-label={`Excluir ${item.label}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-ink">{item.label}</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {item.lessons} aula{item.lessons === 1 ? '' : 's'} · válidas por {creditValidityDays}{' '}
                  dias
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                  {formatCurrency(item.price)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{formatCurrency(perLesson)} por aula</p>
                <div className="mt-auto pt-5">
                  <Button className="w-full" variant="secondary" onClick={() => openSell(item.value)}>
                    Vender este
                  </Button>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}

      <Modal
        open={typeOpen}
        title={editingType ? 'Editar tipo de pacote' : 'Novo tipo de pacote'}
        onClose={() => setTypeOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTypeOpen(false)} disabled={savingType}>
              Fechar
            </Button>
            <Button loading={savingType} onClick={typeForm.handleSubmit(onSaveType)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={typeForm.handleSubmit(onSaveType)}>
          <Input
            label="Nome"
            placeholder="Ex.: Pacote quinzenal"
            error={typeForm.formState.errors.label?.message}
            {...typeForm.register('label')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Aulas"
              type="number"
              min={1}
              max={100}
              error={typeForm.formState.errors.lessons?.message}
              {...typeForm.register('lessons')}
            />
            <Input
              label="Preço (R$)"
              type="number"
              min={0}
              step="0.01"
              error={typeForm.formState.errors.price?.message}
              {...typeForm.register('price')}
            />
          </div>
          {editingType ? (
            <p className="text-xs text-ink-muted">
              Pacotes já vendidos deste tipo mantêm o preço e as aulas da época.
            </p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={sellOpen}
        title="Vender pacote"
        onClose={() => setSellOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSellOpen(false)} disabled={savingSell}>
              Fechar
            </Button>
            <Button loading={savingSell} onClick={sellForm.handleSubmit(onSell)}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={sellForm.handleSubmit(onSell)}>
          <Select
            label="Aluno"
            placeholder="Selecione"
            error={sellForm.formState.errors.studentId?.message}
            options={students.map((student) => ({
              value: student.id,
              label: levelLabel(student.level)
                ? `${student.name} · ${levelLabel(student.level)}`
                : student.name,
            }))}
            {...sellForm.register('studentId')}
          />
          <Select
            label="Pacote"
            error={sellForm.formState.errors.package?.message}
            options={packages.map((item) => ({
              value: item.value,
              label: `${item.label} — ${item.lessons} aula(s) · ${formatCurrency(item.price)}`,
            }))}
            {...sellForm.register('package')}
          />
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {optionFor(selectedPackage).lessons} aula(s) por{' '}
            {formatCurrency(optionFor(selectedPackage).price)}
          </p>
          <Select
            label="Pagamento"
            error={sellForm.formState.errors.status?.message}
            options={[
              { value: 'paid', label: 'Pago agora' },
              { value: 'pending', label: 'Pendente (aulas agora, paga depois)' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            {...sellForm.register('status')}
          />
          <TextArea label="Observações" error={sellForm.formState.errors.notes?.message} {...sellForm.register('notes')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingType)}
        title="Excluir tipo de pacote"
        description="Só some do catálogo. Pacotes já vendidos continuam na ficha do aluno."
        loading={deleting}
        onConfirm={() => void onDeleteType()}
        onCancel={() => setDeletingType(null)}
      />
    </div>
  )
}
