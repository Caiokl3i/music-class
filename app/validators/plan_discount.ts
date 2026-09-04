import vine from '@vinejs/vine'

export const createPlanDiscountValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  amount: vine.number().positive().max(999999.99),
  serviceAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional().nullable(),
  notes: vine.string().trim().maxLength(2000).optional().nullable(),
})

export const updatePlanDiscountValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  amount: vine.number().positive().max(999999.99).optional(),
  serviceAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional().nullable(),
  notes: vine.string().trim().maxLength(2000).optional().nullable(),
})

export const billingQueryValidator = vine.create({
  month: vine
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  timezone: vine.string().trim().optional(),
})
