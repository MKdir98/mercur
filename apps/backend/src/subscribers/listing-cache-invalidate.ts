import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ProductCategoryWorkflowEvents } from '@medusajs/framework/utils'

import { AlgoliaEvents } from '@mercurjs/framework'

import { invalidateListingCache } from '../infrastructure/redis'

// Flushes the store-listing cache (rich-products/brands/popular-products/
// product-categories) whenever product or category data changes. Kept
// independent of the Elasticsearch subscribers so cache invalidation still
// works when Elasticsearch isn't configured (see elasticsearch-products-*.ts,
// which early-return before doing anything if ELASTICSEARCH_MODULE can't be
// resolved). Price-list changes are handled separately at the price-list
// routes since Medusa doesn't emit workflow events for those.
export default async function listingCacheInvalidateHandler(
  _args: SubscriberArgs<{ ids: string[] }>
) {
  await invalidateListingCache()
}

export const config: SubscriberConfig = {
  event: [
    AlgoliaEvents.PRODUCTS_CHANGED,
    AlgoliaEvents.PRODUCTS_DELETED,
    ProductCategoryWorkflowEvents.CREATED,
    ProductCategoryWorkflowEvents.UPDATED,
    ProductCategoryWorkflowEvents.DELETED
  ],
  context: {
    subscriberId: 'listing-cache-invalidate-handler'
  }
}
