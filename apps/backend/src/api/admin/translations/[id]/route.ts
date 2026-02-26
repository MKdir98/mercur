import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'
import { AdminUpdateTranslationType } from '../validators'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: translations } = await query.graph({
    entity: 'translation',
    fields: ['id', 'source_text', 'translated_text'],
    filters: { id: req.params.id }
  })

  const translation = translations?.[0]
  if (!translation) {
    return res.status(404).json({
      message: 'Translation not found'
    })
  }

  res.json({ translation })
}

export const POST = async (
  req: MedusaRequest<AdminUpdateTranslationType>,
  res: MedusaResponse
) => {
  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  const result = await translationsService.updateTranslations({
    id: req.params.id,
    ...req.validatedBody
  })
  const translation = Array.isArray(result) ? result[0] : result

  res.json({ translation })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  await translationsService.deleteTranslations([req.params.id])

  res.status(200).json({
    id: req.params.id,
    object: 'translation',
    deleted: true
  })
}
