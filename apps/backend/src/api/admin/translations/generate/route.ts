import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { generateEntityTranslation } from '../../../../shared/utils/generate-entity-translation'
import { AdminGenerateTranslationType } from '../validators'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

export const POST = async (
  req: MedusaRequest<AdminGenerateTranslationType>,
  res: MedusaResponse
) => {
  const { entity_type, entity_id, field_name } = req.validatedBody

  if (!process.env.FREELLMAPI_KEY) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      'FREELLMAPI_KEY environment variable is not configured'
    )
  }

  await generateEntityTranslation(req.scope, { entity_type, entity_id, field_name })

  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
  const results = await translationsService.listTranslations({
    entity_type, entity_id, field_name,
  })

  res.status(201).json({ translation: results[0] ?? null })
}
