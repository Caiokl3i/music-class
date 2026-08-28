import vine from '@vinejs/vine'

export const dashboardQueryValidator = vine.create({
  timezone: vine.string().trim().optional(),
})
