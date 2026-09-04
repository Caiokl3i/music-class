import { catalogPayload } from '#services/plan_types'
import type { HttpContext } from '@adonisjs/core/http'

export default class CatalogController {
  async packages({ auth }: HttpContext) {
    return { data: await catalogPayload(auth.getUserOrFail()) }
  }
}
