import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { ATTRIBUTE_MODULE, AttributeModuleService } from '@mercurjs/attribute'

/**
 * @oas [delete] /admin/product-colors/{id}
 * operationId: "AdminDeleteProductColor"
 * summary: "Delete Product Color"
 * description: "Removes a canonical RGB/hex assignment for a color value. The color's option values remain untouched; the value simply becomes unassigned again."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin Product Colors
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const productColorId = req.params.id
  const productColorService: AttributeModuleService = req.scope.resolve(ATTRIBUTE_MODULE)

  await productColorService.deleteProductColors([productColorId])

  return res.json({
    id: productColorId,
    object: 'product_color',
    deleted: true
  })
}
