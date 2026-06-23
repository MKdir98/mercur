import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  AdminCreateArticleType,
  AdminGetArticlesParamsType
} from './validators'

/**
 * @oas [get] /admin/articles
 * operationId: "AdminListArticles"
 * summary: "List Articles"
 * description: "Retrieves a list of articles with optional filtering."
 * x-authenticated: true
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *   - name: handle
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *   - name: status
 *     in: query
 *     schema:
 *       type: string
 *       enum: [draft, published]
 *     required: false
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             articles:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Article"
 *             count:
 *               type: integer
 *             offset:
 *               type: integer
 *             limit:
 *               type: integer
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: MedusaRequest<AdminGetArticlesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: articles, metadata } = await query.graph({
    entity: 'article',
    filters: req.filterableFields,
    ...req.queryConfig
  })

  return res.json({
    articles,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}

/**
 * @oas [post] /admin/articles
 * operationId: "AdminCreateArticle"
 * summary: "Create Article"
 * description: "Creates a new article."
 * x-authenticated: true
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - handle
 *           - title_en
 *           - content_en
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
 *   "201":
 *     description: Created
 * tags:
 *   - Admin Articles
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminCreateArticleType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const articleService = req.scope.resolve('article')

  const { tag_ids, category_ids, ...articleData } = req.validatedBody

  const created = await articleService.createArticles(articleData)

  if (tag_ids?.length) {
    await articleService.createArticleTags(
      tag_ids.map((tag_id) => ({
        article_id: created.id,
        article_tag_id: tag_id
      }))
    )
  }

  if (category_ids?.length) {
    await articleService.createArticleCategories(
      category_ids.map((category_id) => ({
        article_id: created.id,
        article_category_id: category_id
      }))
    )
  }

  const {
    data: [article]
  } = await query.graph({
    entity: 'article',
    filters: { id: created.id },
    ...req.queryConfig
  })

  res.status(201).json({ article })
}
