import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'
import { applyTranslations, shouldTranslate } from '../../../shared/utils/apply-translations'

function parseFields(fieldsStr: string | undefined): string[] {
  if (!fieldsStr) return ['id', 'handle', 'name', 'parent_category_id', 'rank', 'metadata']
  return fieldsStr.split(',').map((f) => f.trim()).filter(Boolean)
}

function translateCategories(categories: any[], map: Record<string, string>): any[] {
  return applyTranslations(categories, map, ['name']) as any[]
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const fieldsStr = req.query.fields as string | undefined
  const handle = req.query.handle as string | undefined
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500)
  const offset = parseInt(req.query.offset as string) || 0
  const parentCategoryId = req.query.parent_category_id as string | undefined

  const fields = parseFields(fieldsStr)
  const hasChildren = fieldsStr?.includes('category_children') || fieldsStr === '*category_children,metadata'

  const filters: Record<string, unknown> = {
    is_active: true,
  }
  if (handle) {
    filters['handle'] = handle
  }
  if (parentCategoryId !== undefined && parentCategoryId !== '') {
    filters['parent_category_id'] = parentCategoryId || null
  }

  const fieldsToFetch = hasChildren
    ? ['id', 'handle', 'name', 'parent_category_id', 'rank', 'metadata', 'category_children']
    : fields

  const { data: product_categories, metadata } = await query.graph({
    entity: 'product_category',
    fields: fieldsToFetch,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    pagination: handle ? undefined : { skip: offset, take: limit }
  })

  let result = product_categories || []

  const locale = req.headers['x-locale'] as string | undefined
  if (locale && shouldTranslate(locale) && result.length > 0) {
    const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
    const translationMap = await translationsService.getMapForLocale(locale)
    result = translateCategories(result, translationMap)
    if (hasChildren) {
      for (const cat of result) {
        if (cat.category_children?.length) {
          cat.category_children = translateCategories(cat.category_children, translationMap)
        }
      }
    }
  }

  res.json({
    product_categories: result,
    count: metadata?.count ?? result.length,
    offset: metadata?.skip ?? offset,
    limit: metadata?.take ?? limit
  })
}
