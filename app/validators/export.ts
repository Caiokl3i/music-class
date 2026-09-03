import vine from '@vinejs/vine'

export const exportQueryValidator = vine.create({
  month: vine
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  timezone: vine.string().trim().optional(),
})
