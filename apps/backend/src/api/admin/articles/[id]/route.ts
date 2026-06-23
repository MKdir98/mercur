import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { AdminUpdateArticleType } from '../validators'

/**
 * @oas [get] /admin/articles/{id}
 * operationId: "AdminGetArticle"
 * summary: "Get Article"
 * description: "Retrieves a single article by ID."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             article:
 *               $ref: "#/components/schemas/Article"
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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [article]
  } = await query.graph({
    entity: 'article',
    filters: { id: req.params.id },
    ...req.queryConfig
  })

  res.json({ article })
}

/**
 * @oas [post] /admin/articles/{id}
 * operationId: "AdminUpdateArticle"
 * summary: "Update Article"
 * description: "Updates an article."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           handle:
 *             type: string
 *           status:
 *             type: string
 *             enum: [draft, published]
 *           title_en:
 *             type: string
 *           content_en:
 *             type: string
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminUpdateArticleType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const articleService = req.scope.resolve('article')

  const { tag_ids, category_ids, ...articleData } = req.validatedBody

  await articleService.updateArticles([
    { id: req.params.id, ...articleData }
  ])

  if (tag_ids !== undefined) {
    await articleService.deleteArticleTags(
      (await articleService.listArticleTags({ article_id: req.params.id })).map((t) => t.id)
    )
    if (tag_ids.length) {
      await articleService.createArticleTags(
        tag_ids.map((tag_id) => ({
          article_id: req.params.id,
          article_tag_id: tag_id
        }))
      )
    }
  }

  if (category_ids !== undefined) {
    await articleService.deleteArticleCategories(
      (await articleService.listArticleCategories({ article_id: req.params.id })).map((c) => c.id)
    )
    if (category_ids.length) {
      await articleService.createArticleCategories(
        category_ids.map((category_id) => ({
          article_id: req.params.id,
          article_category_id: category_id
        }))
      )
    }
  }

  const {
    data: [article]
  } = await query.graph({
    entity: 'article',
    filters: { id: req.params.id },
    ...req.queryConfig
  })

  res.json({ article })
}

/**
 * @oas [delete] /admin/articles/{id}
 * operationId: "AdminDeleteArticle"
 * summary: "Delete Article"
 * description: "Deletes an article."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
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

  await articleService.deleteArticles([req.params.id])

  res.status(200).json({ id: req.params.id, object: 'article', deleted: true })
}
