import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(128)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(255).optional().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
  inviteCode: vine.string().trim().minLength(1).maxLength(64),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: password(),
})

export const updateProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(255).nullable(),
  phone: vine.string().trim().maxLength(30).optional().nullable(),
  studioName: vine.string().trim().maxLength(120).optional().nullable(),
  city: vine.string().trim().maxLength(120).optional().nullable(),
  instruments: vine.string().trim().maxLength(255).optional().nullable(),
  bio: vine.string().trim().maxLength(2000).optional().nullable(),
})

export const updatePasswordValidator = vine.create({
  currentPassword: password(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})
