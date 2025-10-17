import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { SELLER_MODULE } from "@mercurjs/seller";

/**
 * @oas [get] /external/sellers/{id}
 * operationId: "ExternalGetSeller"
 * summary: "Get Seller"
 * description: "Retrieves a seller by ID."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The seller ID
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             seller:
 *               $ref: "#/components/schemas/ExternalSeller"
 *   "403":
 *     description: Forbidden - No access to this seller
 *   "404":
 *     description: Not Found
 * tags:
 *   - External API
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["*"],
    filters: {
      id: req.params.id,
    },
  });

  if (!sellers || sellers.length === 0) {
    return res.status(404).json({
      message: "Seller not found",
    });
  }

  res.json({ seller: sellers[0] });
}

/**
 * @oas [put] /external/sellers/{id}
 * operationId: "ExternalUpdateSeller"
 * summary: "Update Seller"
 * description: "Updates a seller."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The seller ID
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *           description:
 *             type: string
 *           email:
 *             type: string
 *           phone:
 *             type: string
 *           address_line:
 *             type: string
 *           city:
 *             type: string
 *           state:
 *             type: string
 *           postal_code:
 *             type: string
 *           country_code:
 *             type: string
 *           tax_id:
 *             type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             seller:
 *               $ref: "#/components/schemas/ExternalSeller"
 *   "403":
 *     description: Forbidden
 *   "404":
 *     description: Not Found
 * tags:
 *   - External API
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const sellerService = req.scope.resolve(SELLER_MODULE);

  const seller = await sellerService.updateSellers({
    id: req.params.id,
    ...req.body,
  });

  res.json({ seller });
}

/**
 * @oas [delete] /external/sellers/{id}
 * operationId: "ExternalDeleteSeller"
 * summary: "Delete Seller"
 * description: "Deletes a seller."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The seller ID
 * responses:
 *   "200":
 *     description: OK
 *   "403":
 *     description: Forbidden
 *   "404":
 *     description: Not Found
 * tags:
 *   - External API
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const sellerService = req.scope.resolve(SELLER_MODULE);

  await sellerService.deleteSellers(req.params.id);

  res.json({ success: true });
}

