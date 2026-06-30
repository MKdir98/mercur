import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FreeLLMApiClient } from '@mercurjs/framework'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

const ENTITY_QUERY_MAP: Record<string, { entity: string }> = {
  product: { entity: 'product' },
  seller: { entity: 'seller' },
  category: { entity: 'product_category' },
}

const PERSIAN_INPUT_ENTITIES = new Set(['product', 'seller'])

function buildPrompt(entityType: string, text: string): string {
  if (PERSIAN_INPUT_ENTITIES.has(entityType)) {
    return `Translate the following Persian text to English. Return only the translated text, no explanations:\n${text}`
  }
  return `Translate the following English text to Persian (Farsi). Return only the translated text, no explanations:\n${text}`
}

type GenerateParams = {
  entity_type: string
  entity_id: string
  field_name: string
}

export async function generateEntityTranslation(
  container: MedusaContainer,
  params: GenerateParams
): Promise<void> {
  const { entity_type, entity_id, field_name } = params

  const apiKey = process.env.FREELLMAPI_KEY
  if (!apiKey) {
    console.warn('[translation] FREELLMAPI_KEY not set — skipping translation generation')
    return
  }

  const entityConfig = ENTITY_QUERY_MAP[entity_type]
  if (!entityConfig) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: entityConfig.entity,
    fields: ['id', field_name],
    filters: { id: entity_id },
  })

  const entityText: string | undefined = data?.[0]?.[field_name]
  if (!entityText) return

  const llmClient = new FreeLLMApiClient({
    apiKey,
    baseUrl: process.env.FREELLMAPI_URL,
  })

  const response = await llmClient.chat([
    { role: 'user', content: buildPrompt(entity_type, entityText) },
  ])
  const generatedText = response.content.trim()

  const isPersianInput = PERSIAN_INPUT_ENTITIES.has(entity_type)
  const source_text = isPersianInput ? generatedText : entityText
  const translated_text = isPersianInput ? entityText : generatedText

  const translationsService = container.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  const existing = await translationsService.listTranslations({
    entity_type, entity_id, field_name,
  })

  if (existing.length > 0) {
    await translationsService.updateTranslations({
      id: existing[0].id,
      source_text,
      translated_text,
    })
  } else {
    await translationsService.createTranslations({
      source_text,
      translated_text,
      entity_type,
      entity_id,
      field_name,
    })
  }
}
