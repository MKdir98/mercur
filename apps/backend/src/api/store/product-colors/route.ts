import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { ATTRIBUTE_MODULE, AttributeModuleService } from '@mercurjs/attribute'

/**
 * @oas [get] /store/product-colors
 * operationId: "StoreListProductColors"
 * summary: "List Product Colors"
 * description: "Returns the canonical RGB/hex value assigned to each color name, for rendering real color swatches on the storefront."
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product_colors:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   value:
 *                     type: string
 *                   hex_code:
 *                     type: string
 * tags:
 *   - Store Product Colors
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productColorService: AttributeModuleService = req.scope.resolve(ATTRIBUTE_MODULE)

  const colors = await productColorService.listProductColors()

  res.json({
    product_colors: colors.map(({ value, hex_code }) => ({ value, hex_code }))
  })
}
