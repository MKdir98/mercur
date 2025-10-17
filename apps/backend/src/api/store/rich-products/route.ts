import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { z } from 'zod'
import sellerProduct from '../../../links/seller-product'

const RichProductsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(12),
  offset: z.coerce.number().optional().default(0),
  country_code: z.string().optional(),
  region_id: z.string().optional(),
  sort_by: z.enum(['sales_count', 'created_at', 'updated_at', 'title']).optional().default('created_at'),
  seller_id: z.string().optional(),
})

type RichProductsQueryType = z.infer<typeof RichProductsQuerySchema>

export const GET = async (
  req: MedusaRequest<RichProductsQueryType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const validatedQuery = RichProductsQuerySchema.parse(req.query)
    const { limit, offset, sort_by, seller_id } = validatedQuery

    // Base filters for products
    const filters: Record<string, any> = { status: 'published' }

    // If seller_id is provided, resolve product_ids via seller-product link
    let productIdToSeller: Record<string, any> = {}
    if (seller_id) {
      const { data: sellerLinks } = await query.graph({
        entity: sellerProduct.entryPoint,
        fields: ['product_id', 'seller_id', 'seller.handle', 'seller.store_status'],
        filters: { seller_id }
      })

      const productIds = (sellerLinks || []).map((l: any) => l.product_id)
      if (productIds.length === 0) {
        return res.json({ products: [], count: 0, limit, offset, sort_by })
      }
      filters['id'] = productIds
      productIdToSeller = Object.fromEntries(
        (sellerLinks || []).map((l: any) => [
          l.product_id,
          { id: l.seller_id, handle: l.seller?.handle, store_status: l.seller?.store_status }
        ])
      )
    }

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
        'variants.inventory_items.inventory.location_levels.stocked_quantity',
        'variants.inventory_items.inventory.location_levels.reserved_quantity',
        'variants.prices.*'
      ],
      filters,
      pagination: {
        skip: offset,
        take: limit,
        order: { created_at: 'DESC' }
      }
    })

    const pricingService = req.scope.resolve(Modules.PRICING)

    // Filter to only include variants with stock > 0, and drop products without any in-stock variants
    // If productIdToSeller not yet populated (no seller_id filter), load links for fetched products
    if (!Object.keys(productIdToSeller).length && (products || []).length) {
      const { data: links } = await query.graph({
        entity: sellerProduct.entryPoint,
        fields: ['product_id', 'seller_id', 'seller.handle', 'seller.store_status'],
        filters: { product_id: (products || []).map((p: any) => p.id) }
      })
      productIdToSeller = Object.fromEntries(
        (links || []).map((l: any) => [
          l.product_id,
          { id: l.seller_id, handle: l.seller?.handle, store_status: l.seller?.store_status }
        ])
      )
    }

    const transformedProducts = await Promise.all((products as any[]).map(async (product: any) => {
      if (!product.variants?.length) return product

      const variantsWithPrices = await Promise.all(product.variants.map(async (variant: any) => {
        const inventoryQuantity = (variant.inventory_items)
          .flatMap((item: any) => (item.inventory.location_levels))
          .reduce((sum: number, level: any) => sum + (Number(level.stocked_quantity)) - (Number(level.reserved_quantity)), 0)

          console.log(inventoryQuantity);
        const basePrice = variant.prices?.[0]
        if (!basePrice) {
          return { ...variant, inventory_quantity: inventoryQuantity, calculated_price: null }
        }

        try {
          const calculatedPrices = await pricingService.calculatePrices(
            { id: [basePrice.price_set_id] },
            { context: { currency_code: basePrice.currency_code || 'IRR' } }
          )

          const calculatedPrice = calculatedPrices?.[0]

          return {
            ...variant,
            inventory_quantity: inventoryQuantity,
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
          return {
            ...variant,
            inventory_quantity: inventoryQuantity,
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

      const seller = productIdToSeller[product.id] || null
      return { ...product, seller, variants: variantsWithPrices }
    }))

    let sortedProducts = transformedProducts
    if (sort_by === 'title') {
      sortedProducts = transformedProducts.sort((a: any, b: any) => a.title.localeCompare(b.title))
    } else if (sort_by === 'created_at') {
      sortedProducts = transformedProducts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
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
    console.error('Error fetching rich products:', error)
    res.status(500).json({
      error: 'Failed to fetch rich products',
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
