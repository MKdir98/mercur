import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { updateProductCategoriesWorkflow } from '@medusajs/medusa/core-flows'

type AdminUpdateProductCategoryBody = {
  name?: string
  handle?: string
  description?: string
  parent_category_id?: string | null
  metadata?: Record<string, unknown>
}

export const PATCH = async (
  req: AuthenticatedMedusaRequest<AdminUpdateProductCategoryBody>,
  res: MedusaResponse
) => {
  const id = req.params.id
  const body = (req.body ?? {}) as AdminUpdateProductCategoryBody

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.handle !== undefined) update.handle = body.handle
  if (body.description !== undefined) update.description = body.description
  if (body.parent_category_id !== undefined) update.parent_category_id = body.parent_category_id
  if (body.metadata !== undefined) update.metadata = body.metadata

  if (Object.keys(update).length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'At least one field to update is required'
    )
  }

  const { result } = await updateProductCategoriesWorkflow(req.scope).run({
    input: {
      selector: { id },
      update
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
