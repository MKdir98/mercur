import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { adminSellerFields } from './query-config'

/**
 * @oas [get] /admin/sellers
 * operationId: "AdminListSellers"
 * summary: "List Sellers"
 * description: "Retrieves a list of sellers."
 * x-authenticated: true
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to skip before starting to collect the result set.
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to return.
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             sellers:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/VendorSeller"
 *             count:
 *               type: integer
 *               description: The total number of items available
 *             offset:
 *               type: integer
 *               description: The number of items skipped before these items
 *             limit:
 *               type: integer
 *               description: The number of items per page
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = req.queryConfig?.fields ?? adminSellerFields
  const pagination = req.queryConfig?.pagination

  const { data: sellers, metadata } = await query.graph({
    entity: 'seller',
    fields,
    pagination
  })

  res.json({
    sellers,
    count: metadata?.count ?? sellers.length,
    offset: metadata?.skip ?? pagination?.skip ?? 0,
    limit: metadata?.take ?? pagination?.take ?? sellers.length
  })
}
