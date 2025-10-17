import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * @oas [get] /external/variants/{id}
 * operationId: "ExternalGetVariant"
 * summary: "Get Product Variant"
 * description: "Retrieves a variant by ID."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The variant ID
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             variant:
 *               $ref: "#/components/schemas/ExternalVariant"
 *   "403":
 *     description: Forbidden
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

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["*", "prices.*", "product.*"],
    filters: {
      id: req.params.id,
    },
  });

  if (!variants || variants.length === 0) {
    return res.status(404).json({
      message: "Variant not found",
    });
  }

  res.json({ variant: variants[0] });
}

/**
 * @oas [put] /external/variants/{id}
 * operationId: "ExternalUpdateVariant"
 * summary: "Update Product Variant"
 * description: "Updates a variant."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The variant ID
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           title:
 *             type: string
 *           sku:
 *             type: string
 *           barcode:
 *             type: string
 *           ean:
 *             type: string
 *           upc:
 *             type: string
 *           allow_backorder:
 *             type: boolean
 *           manage_inventory:
 *             type: boolean
 *           hs_code:
 *             type: string
 *           origin_country:
 *             type: string
 *           material:
 *             type: string
 *           weight:
 *             type: number
 *           length:
 *             type: number
 *           height:
 *             type: number
 *           width:
 *             type: number
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             variant:
 *               $ref: "#/components/schemas/ExternalVariant"
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
  const productService = req.scope.resolve(Modules.PRODUCT);

  const variant = await productService.updateProductVariants({
    id: req.params.id,
    ...req.body,
  });

  res.json({ variant });
}

/**
 * @oas [delete] /external/variants/{id}
 * operationId: "ExternalDeleteVariant"
 * summary: "Delete Product Variant"
 * description: "Deletes a variant."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The variant ID
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
  const productService = req.scope.resolve(Modules.PRODUCT);

  await productService.deleteProductVariants(req.params.id);

  res.json({ success: true });
}

