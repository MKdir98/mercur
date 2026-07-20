import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import {
  ELASTICSEARCH_MODULE,
  ElasticsearchModuleService
} from '@mercurjs/elasticsearch'
import { AlgoliaEvents } from '@mercurjs/framework'

import {
  filterProductsByStatus,
  findAndTransformAlgoliaProducts
} from './utils'

export default async function productsChangedHandler({
  event,
  container
}: SubscriberArgs<{ ids: string[] }>) {
  let elasticsearch: ElasticsearchModuleService
  try {
    elasticsearch =
      container.resolve<ElasticsearchModuleService>(ELASTICSEARCH_MODULE)
  } catch {
    return
  }

  const { published, other } = await filterProductsByStatus(
    container,
    event.data.ids
  )

  if (published.length) {
    const products = await findAndTransformAlgoliaProducts(container, published)
    await elasticsearch.batchIndexProducts(products as any)
  }

  if (other.length) {
    await elasticsearch.batchDeleteProducts(other)
  }
}

export const config: SubscriberConfig = {
  event: AlgoliaEvents.PRODUCTS_CHANGED,
  context: {
    subscriberId: 'elasticsearch-products-changed-handler'
  }
}
