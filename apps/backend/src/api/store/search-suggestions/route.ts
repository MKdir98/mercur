import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

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
      const searchResults = await searchWithElasticsearch(elasticsearchService, query, limit)
      return res.json(searchResults)
    } else {
      const searchResults = await searchWithMySQL(req, query, limit)
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

async function searchWithElasticsearch(elasticsearchService: any, query: string, limit: number) {
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
      size: limit + 1
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

  const products = productsResult.hits.hits.slice(0, limit).map((hit: any) => ({
    id: hit._source.id,
    title: hit._source.title,
    handle: hit._source.handle,
    thumbnail: hit._source.thumbnail
  }))

  return {
    categories,
    sellers,
    products,
    hasMore: {
      categories: categoriesResult.hits.hits.length > limit,
      sellers: sellersResult.hits.hits.length > limit,
      products: productsResult.hits.hits.length > limit
    }
  }
}

async function searchWithMySQL(req: MedusaRequest, query: string, limit: number) {
  const queryService = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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
      take: limit + 1,
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

  const products = (productsResult.data || []).slice(0, limit).map((product: any) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail
  }))

  return {
    categories,
    sellers,
    products,
    hasMore: {
      categories: (categoriesResult.data || []).length > limit,
      sellers: (sellersResult.data || []).length > limit,
      products: (productsResult.data || []).length > limit
    }
  }
}








