import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { AdminCreateArticleTagType, AdminGetArticleTagsParamsType } from './validators'

/**
 * @oas [get] /admin/articles/tags
 * operationId: "AdminListArticleTags"
 * summary: "List Article Tags"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest<AdminGetArticleTagsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: tags, metadata } = await query.graph({
    entity: 'article_tag',
    filters: req.filterableFields,
    ...req.queryConfig
  })

  return res.json({
    tags,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}

/**
 * @oas [post] /admin/articles/tags
 * operationId: "AdminCreateArticleTag"
 * summary: "Create Article Tag"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminCreateArticleTagType>,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve('article')

  const tag = await articleService.createArticleTags(req.validatedBody)

  res.status(201).json({ tag })
}
