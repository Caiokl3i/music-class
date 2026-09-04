import { createError } from '@adonisjs/core/exceptions'
import {
  CREDIT_VALIDITY_DAYS,
  DEFAULT_PLAN_TYPES,
  LESSON_DURATION_MINUTES,
  LOW_CREDIT_THRESHOLD,
} from '#services/package_catalog'
import type User from '#models/user'
import type PlanType from '#models/plan_type'

export const PLAN_TYPE_UNKNOWN = createError(
  'Unknown plan type',
  'E_PLAN_TYPE_UNKNOWN',
  422
)

export const PLAN_TYPE_IN_USE = createError(
  'This plan type is used by existing packages and cannot be deleted',
  'E_PLAN_TYPE_IN_USE',
  422
)

export async function ensureDefaultPlanTypes(user: User) {
  const existing = await user.related('planTypes').query().count('* as total')
  if (Number(existing[0]?.$extras.total ?? 0) > 0) {
    return
  }

  await user.related('planTypes').createMany(
    DEFAULT_PLAN_TYPES.map((item, index) => ({
      slug: item.slug,
      label: item.label,
      lessons: item.lessons,
      price: item.price,
      sortOrder: index,
    }))
  )
}

export function planTypesQuery(user: User) {
  return user.related('planTypes').query().orderBy('sortOrder', 'asc').orderBy('id', 'asc')
}

export async function listPlanTypes(user: User) {
  await ensureDefaultPlanTypes(user)
  return planTypesQuery(user)
}

export function findOwnedPlanType(user: User, id: number | string) {
  return user.related('planTypes').query().where('id', id).firstOrFail()
}

export async function resolvePlanType(user: User, slug: string) {
  await ensureDefaultPlanTypes(user)
  const type = await user.related('planTypes').query().where('slug', slug).first()

  if (!type) {
    throw new PLAN_TYPE_UNKNOWN()
  }

  return type
}

export function slugifyLabel(label: string) {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)

  return slug || 'pacote'
}

export async function uniqueSlug(user: User, label: string) {
  const base = slugifyLabel(label)
  let slug = base
  let suffix = 2

  while (await user.related('planTypes').query().where('slug', slug).first()) {
    slug = `${base}_${suffix}`
    suffix++
  }

  return slug
}

export async function nextSortOrder(user: User) {
  const last = await user.related('planTypes').query().orderBy('sortOrder', 'desc').first()
  return (last?.sortOrder ?? -1) + 1
}

export async function assertPlanTypeUnused(user: User, slug: string) {
  const result = await user.related('plans').query().where('package', slug).count('* as total')

  if (Number(result[0]?.$extras.total ?? 0) > 0) {
    throw new PLAN_TYPE_IN_USE()
  }
}

export function catalogPackages(types: PlanType[]) {
  return types.map((type) => ({
    id: type.id,
    value: type.slug,
    lessons: type.lessons,
    price: Number(type.price),
    label: type.label,
  }))
}

export async function catalogPayload(user: User) {
  const types = await listPlanTypes(user)

  return {
    packages: catalogPackages(types),
    lessonDurationMinutes: LESSON_DURATION_MINUTES,
    creditValidityDays: CREDIT_VALIDITY_DAYS,
    lowCreditThreshold: LOW_CREDIT_THRESHOLD,
  }
}

export async function packageLabelMap(user: User) {
  const types = await listPlanTypes(user)
  return new Map(types.map((type) => [type.slug, type.label] as const))
}
