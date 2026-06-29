import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import { generateEntityTranslation } from '../shared/utils/generate-entity-translation'

export default async function translationProductCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const id = event.data.id

  for (const field_name of ['title', 'description']) {
    try {
      await generateEntityTranslation(container, {
        entity_type: 'product',
        entity_id: id,
        field_name,
      })
    } catch (error) {
      console.error(`[translation] Failed to generate translation for product ${id} field "${field_name}":`, error)
    }
  }
}

export const config: SubscriberConfig = {
  event: 'product.created',
  context: {
    subscriberId: 'translation-product-created-handler'
  }
}
