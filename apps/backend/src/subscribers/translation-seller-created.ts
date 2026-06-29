import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import { generateEntityTranslation } from '../shared/utils/generate-entity-translation'

export default async function translationSellerCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  try {
    await generateEntityTranslation(container, {
      entity_type: 'seller',
      entity_id: event.data.id,
      field_name: 'description',
    })
  } catch (error) {
    console.error(`[translation] Failed to generate translation for seller ${event.data.id}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: 'seller.created',
  context: {
    subscriberId: 'translation-seller-created-handler'
  }
}
