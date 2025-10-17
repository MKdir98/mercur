import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * @oas [post] /external/products
 * operationId: "ExternalCreateProduct"
 * summary: "Create Product"
 * description: "Creates a new product for a seller."
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
 *           - seller_id
 *         properties:
 *           title:
 *             type: string
 *             description: Product title
 *           subtitle:
 *             type: string
 *             description: Product subtitle
 *           description:
 *             type: string
 *             description: Product description
 *           seller_id:
 *             type: string
 *             description: Seller ID that owns this product
 *           handle:
 *             type: string
 *             description: Unique handle for the product
 *           is_giftcard:
 *             type: boolean
 *             description: Whether the product is a gift card
 *           status:
 *             type: string
 *             enum: [draft, proposed, published, rejected]
 *             description: Product status
 *           thumbnail:
 *             type: string
 *             description: Thumbnail URL
 *           collection_id:
 *             type: string
 *             description: Collection ID
 *           type_id:
 *             type: string
 *             description: Product type ID
 *           tags:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *             description: Product tags
 *           categories:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *             description: Product categories
 *           images:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *             description: Product images
 *           options:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 values:
 *                   type: array
 *                   items:
 *                     type: string
 *             description: Product options
 *           variants:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 sku:
 *                   type: string
 *                 barcode:
 *                   type: string
 *                 ean:
 *                   type: string
 *                 upc:
 *                   type: string
 *                 manage_inventory:
 *                   type: boolean
 *                 allow_backorder:
 *                   type: boolean
 *                 prices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       amount:
 *                         type: number
 *                       currency_code:
 *                         type: string
 *                 options:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *             description: Product variants
 * responses:
 *   "201":
 *     description: Created
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product:
 *               $ref: "#/components/schemas/ExternalProduct"
 *   "400":
 *     description: Bad Request
 *   "403":
 *     description: Forbidden - No access to this seller
 * tags:
 *   - External API
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productService = req.scope.resolve(Modules.PRODUCT);

  const product = await productService.createProducts(req.body);

  res.status(201).json({ product });
}

/**
 * @oas [get] /external/products
 * operationId: "ExternalListProducts"
 * summary: "List Products"
 * description: "Retrieves products for accessible sellers."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: seller_id
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by seller ID
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
 *             products:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ExternalProduct"
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

  // Filter by accessible sellers
  if (req.accessibleSellerIds && req.accessibleSellerIds.length > 0) {
    filters.seller_id = req.accessibleSellerIds;
  }

  // Additional filter by specific seller_id if provided
  if (req.query.seller_id) {
    filters.seller_id = req.query.seller_id;
  }

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig?.fields || ["*", "variants.*", "images.*"],
    filters,
    pagination: {
      skip: req.query.offset ? Number(req.query.offset) : 0,
      take: req.query.limit ? Number(req.query.limit) : 20,
    },
  });

  res.json({
    products,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
}

