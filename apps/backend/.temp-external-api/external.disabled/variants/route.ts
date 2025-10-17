import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * @oas [post] /external/variants
 * operationId: "ExternalCreateVariant"
 * summary: "Create Product Variant"
 * description: "Creates a new variant for a product."
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
 *           - title
 *           - product_id
 *         properties:
 *           title:
 *             type: string
 *             description: Variant title
 *           product_id:
 *             type: string
 *             description: Product ID
 *           sku:
 *             type: string
 *             description: Stock keeping unit
 *           barcode:
 *             type: string
 *             description: Barcode
 *           ean:
 *             type: string
 *             description: European Article Number
 *           upc:
 *             type: string
 *             description: Universal Product Code
 *           allow_backorder:
 *             type: boolean
 *             description: Whether backorders are allowed
 *           manage_inventory:
 *             type: boolean
 *             description: Whether to manage inventory for this variant
 *           hs_code:
 *             type: string
 *             description: Harmonized System code
 *           origin_country:
 *             type: string
 *             description: Origin country code
 *           mid_code:
 *             type: string
 *             description: MID code
 *           material:
 *             type: string
 *             description: Material
 *           weight:
 *             type: number
 *             description: Weight
 *           length:
 *             type: number
 *             description: Length
 *           height:
 *             type: number
 *             description: Height
 *           width:
 *             type: number
 *             description: Width
 *           options:
 *             type: object
 *             additionalProperties:
 *               type: string
 *             description: Variant options (e.g., {"Size": "Large", "Color": "Red"})
 *           prices:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 amount:
 *                   type: number
 *                   description: Price amount
 *                 currency_code:
 *                   type: string
 *                   description: Currency code (e.g., "usd")
 *                 region_id:
 *                   type: string
 *                   description: Region ID (optional)
 *             description: Variant prices
 * responses:
 *   "201":
 *     description: Created
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             variant:
 *               $ref: "#/components/schemas/ExternalVariant"
 *   "400":
 *     description: Bad Request
 *   "403":
 *     description: Forbidden
 * tags:
 *   - External API
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productService = req.scope.resolve(Modules.PRODUCT);

  const variant = await productService.createProductVariants(req.body);

  res.status(201).json({ variant });
}

/**
 * @oas [get] /external/variants
 * operationId: "ExternalListVariants"
 * summary: "List Product Variants"
 * description: "Retrieves variants for accessible products."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: product_id
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by product ID
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
 *             variants:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ExternalVariant"
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

  const filters: any = {};

  if (req.query.product_id) {
    filters.product_id = req.query.product_id;
  }

  const { data: variants, metadata } = await query.graph({
    entity: "product_variant",
    fields: req.queryConfig?.fields || ["*", "prices.*"],
    filters,
    pagination: {
      skip: req.query.offset ? Number(req.query.offset) : 0,
      take: req.query.limit ? Number(req.query.limit) : 50,
    },
  });

  res.json({
    variants,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
}

