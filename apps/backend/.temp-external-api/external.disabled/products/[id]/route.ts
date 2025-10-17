import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * @oas [get] /external/products/{id}
 * operationId: "ExternalGetProduct"
 * summary: "Get Product"
 * description: "Retrieves a product by ID."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The product ID
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product:
 *               $ref: "#/components/schemas/ExternalProduct"
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

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["*", "variants.*", "images.*", "options.*"],
    filters: {
      id: req.params.id,
    },
  });

  if (!products || products.length === 0) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  res.json({ product: products[0] });
}

/**
 * @oas [put] /external/products/{id}
 * operationId: "ExternalUpdateProduct"
 * summary: "Update Product"
 * description: "Updates a product."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The product ID
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           title:
 *             type: string
 *           subtitle:
 *             type: string
 *           description:
 *             type: string
 *           handle:
 *             type: string
 *           status:
 *             type: string
 *             enum: [draft, proposed, published, rejected]
 *           thumbnail:
 *             type: string
 *           collection_id:
 *             type: string
 *           type_id:
 *             type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product:
 *               $ref: "#/components/schemas/ExternalProduct"
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

  const product = await productService.updateProducts({
    id: req.params.id,
    ...req.body,
  });

  res.json({ product });
}

/**
 * @oas [delete] /external/products/{id}
 * operationId: "ExternalDeleteProduct"
 * summary: "Delete Product"
 * description: "Deletes a product."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The product ID
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

  await productService.deleteProducts(req.params.id);

  res.json({ success: true });
}

