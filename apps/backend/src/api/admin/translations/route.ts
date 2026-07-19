import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'
import { AdminCreateTranslationType } from './validators'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
  const offset = Number(req.query.offset ?? 0)
  const limit = Number(req.query.limit ?? 50)
  const safeOffset = Number.isNaN(offset) ? 0 : Math.max(offset, 0)
  const safeLimit = Number.isNaN(limit) ? 50 : Math.max(limit, 1)

  const filters: Record<string, unknown> = {}
  const { entity_type, entity_id, field_name } = req.filterableFields as Record<string, string>
  if (entity_type) filters.entity_type = entity_type
  if (entity_id) filters.entity_id = entity_id
  if (field_name) filters.field_name = field_name

  const allTranslations = await translationsService.listTranslations(filters)
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

  const result = await translationsService.createTranslations(req.validatedBody)
  const translation = Array.isArray(result) ? result[0] : result
  translationsService.invalidateCache()

  res.status(201).json({ translation })
}
