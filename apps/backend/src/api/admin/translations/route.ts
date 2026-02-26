import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'
import { AdminCreateTranslationType } from './validators'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const pagination = req.queryConfig?.pagination ?? { skip: 0, take: 50 }

  const { data: translations, metadata } = await query.graph({
    entity: 'translation',
    fields: ['id', 'source_text', 'translated_text'],
    pagination
  })

  res.json({
    translations: translations || [],
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 50
  })
}

export const POST = async (
  req: MedusaRequest<AdminCreateTranslationType>,
  res: MedusaResponse
) => {
  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService

  const result = await translationsService.createTranslations(
    req.validatedBody
  )
  const translation = Array.isArray(result) ? result[0] : result

  res.status(201).json({ translation })
}
