import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { updateProductCategoriesWorkflow } from '@medusajs/medusa/core-flows'
import { MedusaError } from '@medusajs/framework/utils'

/**
 * @oas [get] /vendor/product-categories/{id}
 * operationId: "VendorGetProductCategoryById"
 * summary: "Get product category"
 * description: "Retrieves product category by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the category
 *     schema:
 *       type: string
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product_category:
 *               $ref: "#/components/schemas/VendorProductCategory"
 * tags:
 *   - Vendor Product Categories
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product_category]
  } = await query.graph({
    entity: 'product_category',
    fields: req.queryConfig.fields,
    filters: {
      id: req.params.id
    }
  })

  res.json({ product_category })
}

/**
 * @oas [patch] /vendor/product-categories/{id}
 * operationId: "VendorUpdateProductCategory"
 * summary: "Update product category"
 * description: "Updates product category metadata (e.g. thumbnail image)."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           metadata:
 *             type: object
 *             description: Custom metadata including thumbnail URL
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Vendor Product Categories
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest<{ metadata?: Record<string, unknown> }>,
  res: MedusaResponse
) => {
  const id = req.params.id
  const { metadata } = req.body ?? {}

  if (!metadata || typeof metadata !== 'object') {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'metadata is required'
    )
  }

  const { result } = await updateProductCategoriesWorkflow(req.scope).run({
    input: {
      selector: { id },
      update: { metadata }
    }
  })

  const [product_category] = result
  if (!product_category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id ${id} not found`
    )
  }

  res.json({ product_category })
}
