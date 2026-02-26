import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

const BrandsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
  q: z.string().optional(),
})

type BrandsQueryType = z.infer<typeof BrandsQuerySchema>

export const GET = async (
  req: MedusaRequest<BrandsQueryType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  try {
    const validatedQuery = BrandsQuerySchema.parse(req.query)
    const { limit, offset, q } = validatedQuery

    const filters: any = {
      store_status: 'ACTIVE'
    }

    if (q) {
      filters.name = {
        $ilike: `%${q}%`
      }
    }

    const { data: sellers, metadata } = await query.graph({
      entity: 'seller',
      fields: [
        'id',
        'name',
        'handle',
        'photo',
        'description',
        'store_status',
        'created_at',
        'updated_at',
        'members.id',
        'members.role',
        'members.photo',
        'members.bio'
      ],
      filters,
      pagination: {
        skip: offset,
        take: limit,
        order: { name: 'ASC' }
      }
    })

    const transformedBrands = sellers.map((seller: any) => {
      const ownerMember = Array.isArray(seller.members) ? seller.members.find((m: any) => m?.role === 'owner') || seller.members[0] : null
      const logo = seller.photo || ownerMember?.photo || null
      const description = seller.description || ownerMember?.bio || null
      return {
        id: seller.id,
        name: seller.name,
        handle: seller.handle || seller.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        logo,
        description,
        created_at: seller.created_at,
        updated_at: seller.updated_at
      }
    })

    res.json({
      brands: transformedBrands,
      count: metadata?.count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching brands (sellers):', error)
    res.status(500).json({
      error: 'Failed to fetch brands',
      brands: [],
      count: 0,
      limit: 50,
      offset: 0
    })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(204).send()
}

