import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { z } from 'zod'

interface ElasticsearchService {
  searchProducts(params: any): Promise<{
    products: any[]
    facets: Record<string, any>
    total: number
    processing_time: number
  }>
}

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

export const GET = async (
  req: MedusaRequest<SearchParamsType>,
  res: MedusaResponse
) => {
  console.log('[Backend Search API] 🔍 Received search request:', {
    query: req.query,
    headers: {
      publishableKey: req.headers['x-publishable-api-key'] ? '✅ Present' : '❌ Missing'
    }
  })
  
  try {
    const searchParams = SearchParamsSchema.parse({
      ...req.query,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined
    })
    
    console.log('[Backend Search API] ✅ Validated params:', searchParams)

    let elasticsearchService: ElasticsearchService
    try {
      console.log('[Backend Search API] 🔌 Attempting to resolve Elasticsearch service...')
      elasticsearchService = req.scope.resolve('elasticsearchService') as ElasticsearchService
      
      console.log('[Backend Search API] ✅ Elasticsearch service found, searching...')
      const searchResults = await elasticsearchService.searchProducts(searchParams)
      
      console.log('[Backend Search API] 📥 Elasticsearch results:', {
        productsCount: searchResults.products?.length || 0,
        total: searchResults.total,
        processingTime: searchResults.processing_time
      })
      
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
      console.error('[Backend Search API] ❌ Elasticsearch error:', error);
      console.warn('[Backend Search API] ⚠️ Falling back to regular products API')
    }
    
    console.log('[Backend Search API] 📦 Using fallback: Medusa products API')
    const { ContainerRegistrationKeys } = await import('@medusajs/framework/utils')
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    const filters: any = { status: 'published' }
    
    if (searchParams.query) {
      filters.title = { $ilike: `%${searchParams.query}%` }
    }
    
    console.log('[Backend Search API] 🔍 Querying products with filters:', filters)
    
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
    
    console.log('[Backend Search API] 📥 Query result:', {
      productsCount: products?.length || 0,
      totalCount: metadata?.count || 0
    })
    
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

    console.log('[Backend Search API] 📦 Products with stock:', {
      before: products?.length || 0,
      after: productsWithStockOnly.length
    })

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
    
    console.log('[Backend Search API] ✅ Sending fallback response:', {
      productsCount: searchResults.products.length,
      total: searchResults.total,
      page: searchParams.page,
      totalPages: Math.ceil(searchResults.total / searchParams.limit)
    })
    
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
    console.error('[Backend Search API] ❌ Fatal error:', error)
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    })
  }
}
