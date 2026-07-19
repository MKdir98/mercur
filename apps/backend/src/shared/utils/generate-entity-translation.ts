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
  /** Overwrite a manually edited translation. Defaults to false. */
  force?: boolean
}

export type GenerateTranslationStatus =
  | 'created'
  | 'updated'
  | 'skipped_manual'
  | 'skipped'

export async function generateEntityTranslation(
  container: MedusaContainer,
  params: GenerateParams
): Promise<GenerateTranslationStatus> {
  const { entity_type, entity_id, field_name, force = false } = params

  const apiKey = process.env.FREELLMAPI_KEY
  if (!apiKey) {
    console.warn('[translation] FREELLMAPI_KEY not set — skipping translation generation')
    return 'skipped'
  }

  const entityConfig = ENTITY_QUERY_MAP[entity_type]
  if (!entityConfig) return 'skipped'

  const translationsService = container.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  const existing = await translationsService.listTranslations({
    entity_type, entity_id, field_name,
  })

  if (existing[0]?.manually_edited && !force) {
    return 'skipped_manual'
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: entityConfig.entity,
    fields: ['id', field_name],
    filters: { id: entity_id },
  })

  const entityText: string | undefined = data?.[0]?.[field_name]
  if (!entityText) return 'skipped'

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

  if (existing.length > 0) {
    await translationsService.updateTranslations({
      id: existing[0].id,
      source_text,
      translated_text,
      manually_edited: false,
    })
    translationsService.invalidateCache()
    return 'updated'
  }

  await translationsService.createTranslations({
    source_text,
    translated_text,
    entity_type,
    entity_id,
    field_name,
  })
  translationsService.invalidateCache()
  return 'created'
}
