import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { generateEntityTranslation } from '../../../../shared/utils/generate-entity-translation'
import { AdminGenerateTranslationType } from '../validators'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

export const POST = async (
  req: MedusaRequest<AdminGenerateTranslationType>,
  res: MedusaResponse
) => {
  const { entity_type, entity_id, field_name, force } = req.validatedBody

  if (!process.env.FREELLMAPI_KEY) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      'FREELLMAPI_KEY environment variable is not configured'
    )
  }

  const status = await generateEntityTranslation(req.scope, { entity_type, entity_id, field_name, force })

  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
  const results = await translationsService.listTranslations({
    entity_type, entity_id, field_name,
  })

  if (status === 'skipped_manual') {
    return res.status(200).json({ translation: results[0] ?? null, skipped: true, reason: 'manually_edited' })
  }

  res.status(201).json({ translation: results[0] ?? null })
}
