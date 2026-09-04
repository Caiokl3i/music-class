import vine from '@vinejs/vine'

const planTypeFields = {
  label: vine.string().trim().minLength(1).maxLength(80),
  lessons: vine.number().withoutDecimals().min(1).max(100),
  price: vine.number().min(0).max(99999.99),
}

export const createPlanTypeValidator = vine.create(planTypeFields)

export const updatePlanTypeValidator = vine.create({
  label: planTypeFields.label.clone().optional(),
  lessons: planTypeFields.lessons.clone().optional(),
  price: planTypeFields.price.clone().optional(),
})
