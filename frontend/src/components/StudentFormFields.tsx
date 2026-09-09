import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { z } from 'zod'
import { DateTimeField } from '@/components/DateTimeField'
import { Input } from '@/components/Input'
import { Select } from '@/components/Select'
import { StudentColorPicker } from '@/components/StudentColorPicker'
import { TextArea } from '@/components/TextArea'
import { WEEKDAY_OPTIONS } from '@/domain/schedule'
import { DEFAULT_STUDENT_COLOR } from '@/domain/student'

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Escolha uma cor válida')

export const studentFormSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  instrument: z.string().min(1, 'Informe o instrumento'),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  description: z.string().optional(),
  level: z.union([z.enum(['beginner', 'intermediate']), z.literal('')]).optional(),
  color: hexColor,
  tags: z.string().optional(),
  preferredWeekday: z.string().optional(),
  preferredTime: z.string().optional(),
})

export type StudentFormValues = z.infer<typeof studentFormSchema>

export function StudentFormFields({
  register,
  errors,
  watch,
  setValue,
}: {
  register: UseFormRegister<StudentFormValues>
  errors: FieldErrors<StudentFormValues>
  watch: UseFormWatch<StudentFormValues>
  setValue: UseFormSetValue<StudentFormValues>
}) {
  return (
    <div className="space-y-4">
      <Input label="Nome" error={errors.name?.message} {...register('name')} />
      <Input label="Instrumento" error={errors.instrument?.message} {...register('instrument')} />
      <StudentColorPicker
        value={watch('color') ?? DEFAULT_STUDENT_COLOR}
        error={errors.color?.message}
        onChange={(next) => setValue('color', next, { shouldDirty: true, shouldValidate: false })}
      />
      <Input label="Telefone" error={errors.phone?.message} {...register('phone')} />
      <DateTimeField
        label="Data de nascimento"
        kind="date"
        value={watch('birthdate')}
        error={errors.birthdate?.message}
        onChange={(next) => setValue('birthdate', next, { shouldValidate: true })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Nível"
          error={errors.level?.message}
          options={[
            { value: '', label: 'Sem nível' },
            { value: 'beginner', label: 'Iniciante' },
            { value: 'intermediate', label: 'Intermediário' },
          ]}
          {...register('level')}
        />
        <Input
          label="Etiquetas"
          hint="Separe por vírgula"
          error={errors.tags?.message}
          {...register('tags')}
        />
      </div>
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
        <DateTimeField
          label="Horário"
          kind="time"
          hint="Padrão 14:00"
          value={watch('preferredTime')}
          error={errors.preferredTime?.message}
          onChange={(next) => setValue('preferredTime', next, { shouldValidate: true })}
        />
      </div>
      <TextArea label="Observações" error={errors.description?.message} {...register('description')} />
    </div>
  )
}
