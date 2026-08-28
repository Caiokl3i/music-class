import { catalogPayload } from '#services/package_catalog'

export default class CatalogController {
  async packages() {
    return { data: catalogPayload() }
  }
}
