import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'
import { AdminCreateTranslationType } from './validators'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
  const offset = Number(req.query.offset ?? 0)
  const limit = Number(req.query.limit ?? 50)
  const safeOffset = Number.isNaN(offset) ? 0 : Math.max(offset, 0)
  const safeLimit = Number.isNaN(limit) ? 50 : Math.max(limit, 1)
  const allTranslations = await translationsService.listTranslations({})
  const translations = allTranslations.slice(safeOffset, safeOffset + safeLimit)

  res.json({
    translations: translations || [],
    count: allTranslations.length,
    offset: safeOffset,
    limit: safeLimit
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
