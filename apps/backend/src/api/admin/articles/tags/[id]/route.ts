import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ARTICLE_MODULE, ArticleModuleService } from '@mercurjs/article'

import { AdminUpdateArticleTagType } from '../validators'

/**
 * @oas [get] /admin/articles/tags/{id}
 * operationId: "AdminGetArticleTag"
 * summary: "Get Article Tag"
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
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE)

  const tag = await articleService.retrieveArticleTag(req.params.id)

  res.json({ tag })
}

/**
 * @oas [post] /admin/articles/tags/{id}
 * operationId: "AdminUpdateArticleTag"
 * summary: "Update Article Tag"
 * x-authenticated: true
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminUpdateArticleTagType>,
  res: MedusaResponse
) => {
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE)

  await articleService.updateArticleTags([{ id: req.params.id, ...req.validatedBody }])

  const tag = await articleService.retrieveArticleTag(req.params.id)

  res.json({ tag })
}

/**
 * @oas [delete] /admin/articles/tags/{id}
 * operationId: "AdminDeleteArticleTag"
 * summary: "Delete Article Tag"
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
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE)

  await articleService.deleteArticleTags([req.params.id])

  res.status(200).json({ id: req.params.id, object: 'article_tag', deleted: true })
}
