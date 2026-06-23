import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { AdminUpdateArticleCategoryType } from './validators'

/**
 * @oas [get] /admin/articles/categories/{id}
 * operationId: "AdminGetArticleCategory"
 * summary: "Get Article Category"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve('article')

  const category = await articleService.retrieveArticleCategory(req.params.id)

  res.json({ category })
}

/**
 * @oas [post] /admin/articles/categories/{id}
 * operationId: "AdminUpdateArticleCategory"
 * summary: "Update Article Category"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminUpdateArticleCategoryType>,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve('article')

  await articleService.updateArticleCategories([{ id: req.params.id, ...req.validatedBody }])

  const category = await articleService.retrieveArticleCategory(req.params.id)

  res.json({ category })
}

/**
 * @oas [delete] /admin/articles/categories/{id}
 * operationId: "AdminDeleteArticleCategory"
 * summary: "Delete Article Category"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve('article')

  await articleService.deleteArticleCategories([req.params.id])

  res.status(200).json({ id: req.params.id, object: 'article_category', deleted: true })
}
