import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import {
  ELASTICSEARCH_MODULE,
  ElasticsearchModuleService
} from '@mercurjs/elasticsearch'
import { AlgoliaEvents } from '@mercurjs/framework'

export default async function productsDeletedHandler({
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

  await elasticsearch.batchDeleteProducts(event.data.ids)
}

export const config: SubscriberConfig = {
  event: AlgoliaEvents.PRODUCTS_DELETED,
  context: {
    subscriberId: 'elasticsearch-products-deleted-handler'
  }
}
