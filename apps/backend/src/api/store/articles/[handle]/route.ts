import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * @oas [get] /store/articles/{handle}
 * operationId: "StoreGetArticle"
 * summary: "Get Article"
 * description: "Retrieves a single published article by handle."
 * parameters:
 *   - name: handle
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
 *   "404":
 *     description: Article not found
 * tags:
 *   - Store Articles
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
    filters: {
      handle: req.params.handle,
      status: 'published'
    },
    ...req.queryConfig
  })

  if (!article) {
    return res.status(404).json({ message: 'Article not found' })
  }

  res.json({ article })
}
