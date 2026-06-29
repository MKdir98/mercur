import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import { generateEntityTranslation } from '../shared/utils/generate-entity-translation'

export default async function translationCategoryCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  try {
    await generateEntityTranslation(container, {
      entity_type: 'category',
      entity_id: event.data.id,
      field_name: 'name',
    })
  } catch (error) {
    console.error(`[translation] Failed to generate translation for category ${event.data.id}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: 'product_category.created',
  context: {
    subscriberId: 'translation-category-created-handler'
  }
}
