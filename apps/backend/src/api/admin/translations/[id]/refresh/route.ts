import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

import { generateEntityTranslation } from '../../../../../shared/utils/generate-entity-translation'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  if (!process.env.FREELLMAPI_KEY) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      'FREELLMAPI_KEY environment variable is not configured'
    )
  }

  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  const existing = await translationsService.listTranslations({ filters: { id } })
  const record = existing[0]

  if (!record) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Translation ${id} not found`)
  }

  if (!record.entity_type || !record.entity_id || !record.field_name) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'This translation record has no entity linkage and cannot be refreshed'
    )
  }

  await generateEntityTranslation(req.scope, {
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    field_name: record.field_name,
  })

  const updated = await translationsService.listTranslations({ filters: { id } })

  res.json({ translation: updated[0] ?? null })
}
