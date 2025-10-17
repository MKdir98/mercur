import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { SELLER_MODULE } from "@mercurjs/seller";

/**
 * @oas [post] /external/sellers
 * operationId: "ExternalCreateSeller"
 * summary: "Create Seller"
 * description: "Creates a new seller for the authenticated API client."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - name
 *           - handle
 *         properties:
 *           name:
 *             type: string
 *             description: The name of the seller
 *           handle:
 *             type: string
 *             description: A unique handle for the seller
 *           description:
 *             type: string
 *             description: Description of the seller
 *           email:
 *             type: string
 *             description: Contact email
 *           phone:
 *             type: string
 *             description: Contact phone
 *           address_line:
 *             type: string
 *             description: Address line
 *           city:
 *             type: string
 *             description: City
 *           state:
 *             type: string
 *             description: State
 *           postal_code:
 *             type: string
 *             description: Postal code
 *           country_code:
 *             type: string
 *             description: Country code (ISO 2-letter)
 *           tax_id:
 *             type: string
 *             description: Tax ID
 * responses:
 *   "201":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             seller:
 *               $ref: "#/components/schemas/ExternalSeller"
 *   "400":
 *     description: Bad Request
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - External API
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const sellerService = req.scope.resolve(SELLER_MODULE);

  const seller = await sellerService.createSellers(req.body);

  // Also create the client-seller link
  const apiClientService = req.scope.resolve("api-client");
  await apiClientService.grantSellerAccess(req.apiClient!.id, seller.id);

  res.status(201).json({ seller });
}

/**
 * @oas [get] /external/sellers
 * operationId: "ExternalListSellers"
 * summary: "List Sellers"
 * description: "Retrieves sellers accessible by the authenticated API client."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     description: The number of items to skip
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     description: The number of items to return
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
 *                 $ref: "#/components/schemas/ExternalSeller"
 *             count:
 *               type: integer
 *             offset:
 *               type: integer
 *             limit:
 *               type: integer
 * tags:
 *   - External API
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: sellers, metadata } = await query.graph({
    entity: "seller",
    fields: req.queryConfig?.fields || ["*"],
    filters: {
      id: req.accessibleSellerIds || [],
    },
    pagination: {
      skip: req.query.offset ? Number(req.query.offset) : 0,
      take: req.query.limit ? Number(req.query.limit) : 20,
    },
  });

  res.json({
    sellers,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
}

