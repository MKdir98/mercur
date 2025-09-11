import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'
import { storeCors } from '../cors'

const FeaturedSellersQuerySchema = z.object({
  limit: z.coerce.number().optional().default(8),
  offset: z.coerce.number().optional().default(0),
})

type FeaturedSellersQueryType = z.infer<typeof FeaturedSellersQuerySchema>

export const GET = async (
  req: MedusaRequest<FeaturedSellersQueryType>,
  res: MedusaResponse
) => {
  // Apply CORS
  storeCors(req, res, () => {})

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  try {
    const validatedQuery = FeaturedSellersQuerySchema.parse(req.query)
    const { limit, offset } = validatedQuery

    // Query real sellers from database
    const { data: sellers, metadata } = await query.graph({
      entity: 'seller',
      fields: [
        'id',
        'name',
        'handle',
        'description',
        'photo',
        'store_status',
        'created_at',
        'updated_at'
      ],
      filters: {
        store_status: 'ACTIVE'
      },
      pagination: {
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' }
      }
    })

    // Transform sellers data for frontend
    const transformedSellers = sellers.map(seller => ({
      id: seller.id,
      name: seller.name,
      handle: seller.handle,
      avatar: seller.photo || "/images/rothys/products/max-mary-jane-syra.jpg", // Default avatar
      rating: 4.7
    }))

    res.json({
      sellers: transformedSellers,
      count: metadata?.count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching featured sellers:', error)
    res.status(500).json({
      error: 'Failed to fetch featured sellers',
      sellers: [],
      count: 0,
      limit: 8,
      offset: 0
    })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  storeCors(req, res, () => {})
  res.status(204).send()
}
