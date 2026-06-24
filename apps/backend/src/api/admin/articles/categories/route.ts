import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { ARTICLE_MODULE, ArticleModuleService } from '@mercurjs/article'

import { AdminCreateArticleCategoryType, AdminGetArticleCategoriesParamsType } from './validators'

/**
 * @oas [get] /admin/articles/categories
 * operationId: "AdminListArticleCategories"
 * summary: "List Article Categories"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest<AdminGetArticleCategoriesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: categories, metadata } = await query.graph({
    entity: 'article_category',
    filters: req.filterableFields,
    ...req.queryConfig
  })

  return res.json({
    categories,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}

/**
 * @oas [post] /admin/articles/categories
 * operationId: "AdminCreateArticleCategory"
 * summary: "Create Article Category"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminCreateArticleCategoryType>,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE)

  const category = await articleService.createArticleCategories(req.validatedBody)

  res.status(201).json({ category })
}
