import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  const sizes = await knex('product_size')
    .where({ is_active: true })
    .orderBy('sort_order', 'asc')
    .select('id', 'name', 'width', 'height', 'length', 'sort_order')

  res.json({ product_sizes: sizes })
}
