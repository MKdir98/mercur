import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * @oas [get] /store/articles
 * operationId: "StoreListArticles"
 * summary: "List Articles"
 * description: "Retrieves a list of published articles."
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *   - name: category
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by category handle
 *   - name: tag
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by tag handle
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
 * tags:
 *   - Store Articles
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters: Record<string, any> = {
    status: 'published'
  }

  const { data: articles, metadata } = await query.graph({
    entity: 'article',
    filters,
    ...req.queryConfig
  })

  return res.json({
    articles,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}
