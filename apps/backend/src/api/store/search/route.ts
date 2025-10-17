import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { z } from 'zod'

// Type for Elasticsearch service (will be replaced with proper import when module is set up)
interface ElasticsearchService {
  searchProducts(params: any): Promise<{
    products: any[]
    facets: Record<string, any>
    total: number
    processing_time: number
  }>
}

// Validation schema for search parameters
const SearchParamsSchema = z.object({
  query: z.string().optional(),
  filters: z.string().optional(),
  category_id: z.string().optional(),
  category: z.string().optional(),
  collection_id: z.string().optional(),
  seller_handle: z.string().optional(),
  locale: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  condition: z.string().optional(),
  sort_by: z.string().optional(),
  facets: z.string().optional()
})

type SearchParamsType = z.infer<typeof SearchParamsSchema>

/**
 * @oas [get] /store/search
 * operationId: "StoreSearchProducts"
 * summary: "Search Products"
 * description: "Search products using Elasticsearch with filters and facets"
 * parameters:
 *   - name: query
 *     in: query
 *     schema:
 *       type: string
 *     description: Search query text
 *   - name: filters
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter string for products
 *   - name: category_id
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by category ID
 *   - name: seller_handle
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by seller handle
 *   - name: page
 *     in: query
 *     schema:
 *       type: number
 *     description: Page number for pagination
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     description: Number of items per page
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
 *               description: Array of products
 *             facets:
 *               type: object
 *               description: Available facets for filtering
 *             pagination:
 *               type: object
 *               description: Pagination information
 *             total:
 *               type: number
 *               description: Total number of results
 * tags:
 *   - Store Search
 */
export const GET = async (
  req: MedusaRequest<SearchParamsType>,
  res: MedusaResponse
) => {
  try {
    // Validate query parameters
    const searchParams = SearchParamsSchema.parse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined
    })

    // Get Elasticsearch service from container
    let elasticsearchService: ElasticsearchService
    try {
      elasticsearchService = req.scope.resolve('elasticsearchService') as ElasticsearchService
      
      // If service exists, use it
      const searchResults = await elasticsearchService.searchProducts(searchParams)
      
      res.json({
        products: searchResults.products,
        facets: searchResults.facets,
        pagination: {
          page: searchParams.page,
          limit: searchParams.limit,
          total_pages: Math.ceil(searchResults.total / searchParams.limit)
        },
        total: searchResults.total,
        processing_time: searchResults.processing_time
      })
      return
      
    } catch (error) {
      console.error('Error searching products:', error);
      console.warn('Elasticsearch service not found, using fallback to regular products API')
    }
    
    // FALLBACK: Use regular Medusa products API
    const { ContainerRegistrationKeys } = await import('@medusajs/framework/utils')
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    // Build filters for regular query
    const filters: any = { status: 'published' }
    
    // Text search simulation (basic)
    if (searchParams.query) {
      filters.title = { $ilike: `%${searchParams.query}%` }
    }
    
    // Get products using regular Medusa query
    const { data: products, metadata } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'subtitle',
        'description',
        'handle',
        'thumbnail',
        'images.*',
        'status',
        'created_at',
        'updated_at',
        'variants.*',
        'variants.inventory_quantity',
        'variants.prices.*'
      ],
      filters,
      pagination: {
        skip: (searchParams.page - 1) * searchParams.limit,
        take: searchParams.limit
      }
    })
    
    // Keep only variants with stock > 0 and drop products with none
    const productsWithStockOnly = (products || [])
      .map((product: any) => {
        const variants = Array.isArray(product.variants) ? product.variants : []
        const inStockVariants = variants.filter((variant: any) =>
          typeof variant.inventory_quantity === 'number' && variant.inventory_quantity > 0
        )
        if (inStockVariants.length === 0) return null
        return { ...product, variants: inStockVariants }
      })
      .filter(Boolean)

    // Calculate prices with promotions for search results
    const pricingService = req.scope.resolve(Modules.PRICING)
    
    const productsWithCalculatedPrices = await Promise.all((productsWithStockOnly as any[]).map(async (product: any) => {
      if (!product.variants?.length) return product
      
      const variantsWithPrices = await Promise.all(
        product.variants.map(async (variant: any) => {
          const basePrice = variant.prices?.[0]
          if (!basePrice) {
            return { ...variant, calculated_price: null }
          }

          try {
            const calculatedPrices = await pricingService.calculatePrices(
              { id: [basePrice.price_set_id] },
                             {
                 context: {
                   currency_code: basePrice.currency_code || 'IRR'
                   // region_id and country_code not available in search params
                 }
               }
            )

            const calculatedPrice = calculatedPrices?.[0]
            
            return {
              ...variant,
              calculated_price: calculatedPrice ? {
                calculated_amount: calculatedPrice.calculated_amount,
                calculated_amount_with_tax: calculatedPrice.calculated_amount,
                original_amount: basePrice.amount,
                original_amount_with_tax: basePrice.amount,
                                 currency_code: basePrice.currency_code || 'IRR'
                 // price_list_type not available in CalculatedPriceSet
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
        })
      )
      return {
        ...product,
        variants: variantsWithPrices
      }
    }))
    
    // Simulate search response format
    const searchResults = {
      products: productsWithCalculatedPrices,
      facets: {
        categories: [],
        colors: [],
        sizes: [],
        conditions: [],
        price_range: { min: 0, max: 1000, avg: 500 }
      },
      total: metadata?.count || 0,
      processing_time: 10
    }
    
    res.json({
      products: searchResults.products,
      facets: searchResults.facets,
      pagination: {
        page: searchParams.page,
        limit: searchParams.limit,
        total_pages: Math.ceil(searchResults.total / searchParams.limit)
      },
      total: searchResults.total,
      processing_time: searchResults.processing_time
    })
    
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    })
  }
} 