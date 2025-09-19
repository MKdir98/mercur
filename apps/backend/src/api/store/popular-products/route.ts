import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
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

    // Query real products from database without calculated prices
    const { data: products, metadata } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'thumbnail',
        'status',
        'images.*',
        'variants.*',
        'variants.prices.*'
      ],
      filters: {
        status: 'published'
      },
      pagination: {
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' }
      }
    })

    console.log('Fetched products count:', products?.length || 0)

    // Calculate prices with promotions for popular products
    const pricingService = req.scope.resolve(Modules.PRICING)
    
    const transformedProducts = await Promise.all((products || []).map(async (product: any) => {
      if (!product.variants?.length) return product
      
      const variantsWithPrices = await Promise.all(product.variants.map(async (variant: any) => {
        const basePrice = variant.prices?.[0]
        if (!basePrice) {
          return { ...variant, calculated_price: null }
        }

        try {
          // Calculate price with current promotions and context
          const calculatedPrices = await pricingService.calculatePrices(
            { id: [basePrice.price_set_id] },
            {
              context: {
                currency_code: basePrice.currency_code || 'IRR',
              }
            }
          )

          const calculatedPrice = calculatedPrices?.[0]
          
          return {
            ...variant,
            calculated_price: calculatedPrice ? {
              calculated_amount: calculatedPrice.calculated_amount,
              calculated_amount_with_tax: calculatedPrice.calculated_amount,
              original_amount: (calculatedPrice as any).original_amount || basePrice.amount,
              original_amount_with_tax: (calculatedPrice as any).original_amount || basePrice.amount,
              currency_code: basePrice.currency_code || 'IRR',
              price_list_type: (calculatedPrice as any).price_list_type || null
            } : {
              calculated_amount: basePrice.amount,
              calculated_amount_with_tax: basePrice.amount,
              original_amount: basePrice.amount,
              original_amount_with_tax: basePrice.amount,
              currency_code: basePrice.currency_code || 'IRR'
            }
          }
        } catch (error) {
          console.error('Error calculating price for variant:', variant.id, error)
          // Fallback to original price structure
          return {
            ...variant,
            calculated_price: {
              calculated_amount: basePrice.amount,
              calculated_amount_with_tax: basePrice.amount,
              original_amount: basePrice.amount,
              original_amount_with_tax: basePrice.amount,
              currency_code: basePrice.currency_code || 'IRR'
            }
          }
        }
      }))

      return {
        ...product,
        variants: variantsWithPrices
      }
    }))

    // Sort products based on sort_by parameter
    let sortedProducts = transformedProducts
    if (sort_by === 'title') {
      sortedProducts = transformedProducts.sort((a: any, b: any) => a.title.localeCompare(b.title))
    } else if (sort_by === 'created_at') {
      sortedProducts = transformedProducts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
      // For sales_count and other cases, use random order for now
      sortedProducts = transformedProducts.sort(() => Math.random() - 0.5)
    }

    res.json({
      products: sortedProducts,
      count: metadata?.count || 0,
      limit,
      offset,
      sort_by
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
