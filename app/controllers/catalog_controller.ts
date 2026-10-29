import { getEnabledFeatures } from '#services/feature_flags'
import { catalogPayload } from '#services/plan_types'
import type { HttpContext } from '@adonisjs/core/http'

export default class CatalogController {
  async packages({ auth }: HttpContext) {
    return { data: await catalogPayload(auth.getUserOrFail()) }
  }

  async features({ auth }: HttpContext) {
    auth.getUserOrFail()
    return { data: { features: getEnabledFeatures() } }
  }
}
