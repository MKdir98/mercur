import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { adminRequestsFields } from './query-config'

/**
 * @oas [get] /admin/requests
 * operationId: "AdminListRequests"
 * summary: "List requests"
 * description: "Retrieves requests list"
 * x-authenticated: true
 * parameters:
 *   - in: query
 *     name: limit
 *     schema:
 *       type: number
 *     description: The number of items to return. Default 50.
 *   - in: query
 *     name: offset
 *     schema:
 *       type: number
 *     description: The number of items to skip before starting the response. Default 0.
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 *   - name: type
 *     in: query
 *     schema:
 *       type: string
 *       enum: [product,product_collection,product_category,seller,review_remove,product_type,product_tag,product_update]
 *     required: false
 *     description: Filter by request type
 *   - name: status
 *     in: query
 *     schema:
 *       type: string
 *       enum: [pending,rejected,accepted]
 *     required: false
 *     description: Filter by request status
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             requests:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/AdminRequest"
 *             count:
 *               type: integer
 *               description: The total number of requests
 *             offset:
 *               type: integer
 *               description: The number of requests skipped
 *             limit:
 *               type: integer
 *               description: The number of requests per page
 * tags:
 *   - Admin Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = req.queryConfig?.fields ?? adminRequestsFields
  const pagination = req.queryConfig?.pagination ?? { skip: 0, take: 50 }
  const filterableFields = req.filterableFields ?? {}

  const { data: requests, metadata } = await query.graph({
    entity: 'request',
    fields,
    filters: {
      ...filterableFields,
      status: filterableFields.status || { $ne: 'draft' }
    },
    pagination
  })

  res.json({
    requests,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}
