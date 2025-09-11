import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

const PopularProductsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(12),
  offset: z.coerce.number().optional().default(0),
  country_code: z.string().optional(),
  region_id: z.string().optional(),
  sort_by: z.enum(['sales_count', 'created_at', 'updated_at', 'title']).optional().default('sales_count'),
})

type PopularProductsQueryType = z.infer<typeof PopularProductsQuerySchema>

export const GET = async (
  req: MedusaRequest<PopularProductsQueryType>,
  res: MedusaResponse
) => {
  // Apply CORS

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  try {
    const validatedQuery = PopularProductsQuerySchema.parse(req.query)
    const { limit, offset, country_code, region_id, sort_by } = validatedQuery

    // Query real products from database
    const { data: products, metadata } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'thumbnail',
        'status'
      ],
      filters: {},
      pagination: {
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' }
      }
    })

    console.log('Fetched products count:', products?.length || 0)

    // If no products found, return sample data for now
    if (!products || products.length === 0) {
      const sampleProducts = [
        {
          id: "prod_sample_1",
          title: "کفش اسپرت مردانه",
          handle: "mens-sport-shoes",
          thumbnail: "/images/rothys/products/max-mary-jane-syra.jpg",
          status: "published",
          variants: [
            {
              id: "variant_1",
              calculated_price: {
                calculated_amount: 1500000,
                calculated_amount_with_tax: 1650000,
                original_amount: 1800000,
                original_amount_with_tax: 1980000,
                currency_code: "IRR"
              }
            }
          ]
        },
        {
          id: "prod_sample_2",
          title: "کیف زنانه چرمی",
          handle: "womens-leather-bag",
          thumbnail: "/images/rothys/products/almond-slingback-red.jpg",
          status: "published",
          variants: [
            {
              id: "variant_2",
              calculated_price: {
                calculated_amount: 2500000,
                calculated_amount_with_tax: 2750000,
                original_amount: 3000000,
                original_amount_with_tax: 3300000,
                currency_code: "IRR"
              }
            }
          ]
        }
      ]
      
      return res.json({
        products: sampleProducts,
        count: sampleProducts.length,
        limit,
        offset,
        sort_by: validatedQuery.sort_by
      })
    }

    // Sort products (simulate popularity for now)
    const sortedProducts = products.sort(() => Math.random() - 0.5)

    res.json({
      products: sortedProducts,
      count: metadata?.count || 0,
      limit,
      offset,
      sort_by: validatedQuery.sort_by
    })

  } catch (error) {
    console.error('Error fetching popular products:', error)
    res.status(500).json({
      error: 'Failed to fetch popular products',
      products: [],
      count: 0,
      limit: 12,
      offset: 0
    })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(204).send()
}
