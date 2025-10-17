import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * @oas [get] /admin/api-clients/{id}/sellers
 * operationId: "AdminGetApiClientSellers"
 * summary: "Get API Client Sellers"
 * description: "Retrieves sellers accessible by an API client."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
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
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   handle:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 *   "404":
 *     description: Not Found
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Get accessible seller IDs
  const sellerIds = await apiClientService.getAccessibleSellerIds(
    req.params.id
  );

  if (!sellerIds || sellerIds.length === 0) {
    return res.json({ sellers: [] });
  }

  // Fetch seller details
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name", "handle", "email"],
    filters: {
      id: sellerIds,
    },
  });

  res.json({ sellers });
}

/**
 * @oas [post] /admin/api-clients/{id}/sellers
 * operationId: "AdminGrantApiClientSellerAccess"
 * summary: "Grant Seller Access"
 * description: "Grants an API client access to a seller."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - seller_id
 *         properties:
 *           seller_id:
 *             type: string
 *             description: Seller ID to grant access to
 * responses:
 *   "200":
 *     description: OK
 *   "400":
 *     description: Bad Request
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);

  const { seller_id } = req.body;

  if (!seller_id) {
    return res.status(400).json({
      message: "seller_id is required",
    });
  }

  await apiClientService.grantSellerAccess(req.params.id, seller_id);

  res.json({ success: true });
}

/**
 * @oas [delete] /admin/api-clients/{id}/sellers/{seller_id}
 * operationId: "AdminRevokeApiClientSellerAccess"
 * summary: "Revoke Seller Access"
 * description: "Revokes an API client's access to a seller."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
 *   - name: seller_id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The seller ID
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);

  await apiClientService.revokeSellerAccess(
    req.params.id,
    req.params.seller_id
  );

  res.json({ success: true });
}

