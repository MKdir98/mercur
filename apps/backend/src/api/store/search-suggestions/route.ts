import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

// How many raw candidates to pull before applying in-stock-first ordering,
// so that in-stock matches get first crack at the `limit` product slots.
const PRODUCT_CANDIDATE_LIMIT = 20

function isProductOutOfStock(product: any): boolean {
  const variants = product.variants || []
  if (variants.length === 0) return false
  const hasAvailableVariant = variants.some((v: any) => {
    if (!v.manage_inventory) return true
    const available = v.inventory_quantity ?? 0
    return available > 0 || v.allow_backorder
  })
  return !hasAvailableVariant
}

// Given raw product candidates (already relevance-ordered, more than `limit`),
// look up real stock and fill `limit` slots with in-stock matches first,
// backfilling with out-of-stock matches only if there aren't enough.
async function selectProductsByStock(
  queryService: any,
  candidates: Array<{ id: string; title: string; handle: string; thumbnail?: string }>,
  limit: number
): Promise<{ products: typeof candidates; hasMore: boolean }> {
  if (candidates.length === 0) {
    return { products: [], hasMore: false }
  }

  const { data: stockProducts } = await queryService.graph({
    entity: 'product',
    fields: [
      'id',
      'variants.manage_inventory',
      'variants.allow_backorder',
      'variants.inventory_items.inventory.location_levels.stocked_quantity',
      'variants.inventory_items.inventory.location_levels.reserved_quantity'
    ],
    filters: { id: candidates.map((c) => c.id) }
  }).catch(() => ({ data: [] }))

  const outOfStockIds = new Set(
    (stockProducts || [])
      .map((product: any) => {
        const variants = (product.variants || []).map((variant: any) => {
          const inventoryQuantity = (variant.inventory_items || [])
            .flatMap((item: any) => item.inventory?.location_levels || [])
            .reduce(
              (sum: number, level: any) =>
                sum + Number(level.stocked_quantity) - Number(level.reserved_quantity),
              0
            )
          return { ...variant, inventory_quantity: inventoryQuantity }
        })
        return { id: product.id, isOutOfStock: isProductOutOfStock({ variants }) }
      })
      .filter((p: any) => p.isOutOfStock)
      .map((p: any) => p.id)
  )

  const inStock = candidates.filter((c) => !outOfStockIds.has(c.id))
  const outOfStock = candidates.filter((c) => outOfStockIds.has(c.id))
  const ordered = [...inStock, ...outOfStock]

  return {
    products: ordered.slice(0, limit),
    hasMore: candidates.length > limit
  }
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const query = req.query.q as string

  if (!query || query.length < 2) {
    return res.json({
      categories: [],
      sellers: [],
      products: [],
      hasMore: { categories: false, sellers: false, products: false }
    })
  }

  const limit = 5
  const queryService = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  let useElasticsearch = false
  let elasticsearchService: any

  try {
    elasticsearchService = req.scope.resolve('elasticsearch')
    await elasticsearchService.client.ping()
    useElasticsearch = true
    console.log('[Search Suggestions] Using Elasticsearch')
  } catch (error) {
    console.log('[Search Suggestions] Elasticsearch unavailable, falling back to MySQL')
  }

  try {
    if (useElasticsearch) {
      const searchResults = await searchWithElasticsearch(elasticsearchService, queryService, query, limit)
      return res.json(searchResults)
    } else {
      const searchResults = await searchWithMySQL(req, queryService, query, limit)
      return res.json(searchResults)
    }
  } catch (error) {
    console.error('[Search Suggestions] Error:', error)
    return res.status(500).json({
      error: 'Search failed',
      categories: [],
      sellers: [],
      products: [],
      hasMore: { categories: false, sellers: false, products: false }
    })
  }
}

async function searchWithElasticsearch(elasticsearchService: any, queryService: any, query: string, limit: number) {
  const categoriesPromise = elasticsearchService.client.search({
    index: 'product_categories',
    body: {
      query: {
        match: {
          name: {
            query: query,
            fuzziness: 'AUTO'
          }
        }
      },
      size: limit + 1
    }
  }).catch(() => ({ hits: { hits: [] } }))

  const sellersPromise = elasticsearchService.client.search({
    index: 'sellers',
    body: {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['name^2', 'handle'],
                fuzziness: 'AUTO'
              }
            }
          ],
          must_not: [
            { term: { store_status: 'SUSPENDED' } }
          ]
        }
      },
      size: limit + 1
    }
  }).catch(() => ({ hits: { hits: [] } }))

  const productsPromise = elasticsearchService.client.search({
    index: 'products',
    body: {
      query: {
        bool: {
          must: [
            {
              match: {
                title: {
                  query: query,
                  fuzziness: 'AUTO'
                }
              }
            },
            { term: { status: 'published' } }
          ],
          must_not: [
            { term: { 'seller.store_status': 'SUSPENDED' } }
          ]
        }
      },
      size: PRODUCT_CANDIDATE_LIMIT + 1
    }
  }).catch(() => ({ hits: { hits: [] } }))

  const [categoriesResult, sellersResult, productsResult] = await Promise.all([
    categoriesPromise,
    sellersPromise,
    productsPromise
  ])

  const categories = categoriesResult.hits.hits.slice(0, limit).map((hit: any) => ({
    id: hit._source.id,
    name: hit._source.name,
    handle: hit._source.handle
  }))

  const sellers = sellersResult.hits.hits.slice(0, limit).map((hit: any) => ({
    id: hit._source.id,
    name: hit._source.name,
    handle: hit._source.handle,
    photo: hit._source.photo
  }))

  const productCandidates = productsResult.hits.hits.map((hit: any) => ({
    id: hit._source.id,
    title: hit._source.title,
    handle: hit._source.handle,
    thumbnail: hit._source.thumbnail
  }))
  const { products, hasMore: productsHaveMore } = await selectProductsByStock(
    queryService,
    productCandidates,
    limit
  )

  return {
    categories,
    sellers,
    products,
    hasMore: {
      categories: categoriesResult.hits.hits.length > limit,
      sellers: sellersResult.hits.hits.length > limit,
      products: productsHaveMore
    }
  }
}

async function searchWithMySQL(req: MedusaRequest, queryService: any, query: string, limit: number) {
  const categoriesPromise = queryService.graph({
    entity: 'product_category',
    fields: ['id', 'name', 'handle'],
    filters: {
      name: { $ilike: `%${query}%` }
    },
    pagination: {
      take: limit + 1,
      skip: 0
    }
  }).catch(() => ({ data: [], metadata: { count: 0 } }))

  const sellersPromise = queryService.graph({
    entity: 'seller',
    fields: ['id', 'name', 'handle', 'photo', 'store_status'],
    filters: {
      $or: [
        { name: { $ilike: `%${query}%` } },
        { handle: { $ilike: `%${query}%` } }
      ],
      store_status: { $ne: 'SUSPENDED' }
    },
    pagination: {
      take: limit + 1,
      skip: 0
    }
  }).catch(() => ({ data: [], metadata: { count: 0 } }))

  const productsPromise = queryService.graph({
    entity: 'product',
    fields: ['id', 'title', 'handle', 'thumbnail'],
    filters: {
      title: { $ilike: `%${query}%` },
      status: 'published'
    },
    pagination: {
      take: PRODUCT_CANDIDATE_LIMIT + 1,
      skip: 0
    }
  }).catch(() => ({ data: [], metadata: { count: 0 } }))

  const [categoriesResult, sellersResult, productsResult] = await Promise.all([
    categoriesPromise,
    sellersPromise,
    productsPromise
  ])

  const categories = (categoriesResult.data || []).slice(0, limit).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle
  }))

  const sellers = (sellersResult.data || []).slice(0, limit).map((seller: any) => ({
    id: seller.id,
    name: seller.name,
    handle: seller.handle,
    photo: seller.photo
  }))

  const productCandidates = (productsResult.data || []).map((product: any) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail
  }))
  const { products, hasMore: productsHaveMore } = await selectProductsByStock(
    queryService,
    productCandidates,
    limit
  )

  return {
    categories,
    sellers,
    products,
    hasMore: {
      categories: (categoriesResult.data || []).length > limit,
      sellers: (sellersResult.data || []).length > limit,
      products: productsHaveMore
    }
  }
}











