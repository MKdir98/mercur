import { Client } from '@elastic/elasticsearch'

type ModuleOptions = {
  node: string
  auth?: {
    username: string
    password: string
  }
}

export interface ElasticsearchProduct {
  id: string
  title: string
  subtitle?: string
  description?: string
  handle: string
  thumbnail?: string
  status: string
  tags: Array<{ value: string }>
  type?: { value: string }
  categories: Array<{ id: string; name: string }>
  collections: Array<{ id: string; title: string }>
  variants: Array<{
    id: string
    title: string
    sku?: string
    color?: string
    size?: string
    condition?: string
    prices: Array<{
      amount: number
      currency_code: string
    }>
    inventory_quantity: number
  }>
  seller: {
    id: string
    handle: string
    store_name: string
    store_status: string
  }
  brand?: {
    id: string
    name: string
  }
  average_rating?: number
  supported_countries: string[]
  created_at: string
  updated_at: string
}

export interface SearchParams {
  query?: string
  filters?: string
  category_id?: string
  category?: string
  collection_id?: string
  seller_handle?: string
  locale?: string
  page: number
  limit: number
  min_price?: number
  max_price?: number
  color?: string
  size?: string
  condition?: string
  sort_by?: string
  facets?: string
}

export interface SearchResults {
  products: ElasticsearchProduct[]
  facets: Record<string, any>
  total: number
  processing_time: number
}

export class ElasticsearchModuleService {
  private client: Client
  private productIndex = 'products'
  private reviewIndex = 'reviews'

  constructor(options: ModuleOptions) {
    this.client = new Client({
      node: options.node,
      auth: options.auth
    })
  }

  async createIndex(indexName: string, mapping: any) {
    try {
      const exists = await this.client.indices.exists({ index: indexName })
      
      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          body: {
            mappings: mapping
          }
        })
      }
    } catch (error) {
      console.error(`Error creating index ${indexName}:`, error)
      throw error
    }
  }

  async indexProduct(product: ElasticsearchProduct) {
    try {
      await this.client.index({
        index: this.productIndex,
        id: product.id,
        body: product
      })
    } catch (error) {
      console.error('Error indexing product:', error)
      throw error
    }
  }

  async batchIndexProducts(products: ElasticsearchProduct[]) {
    try {
      const body = products.flatMap(product => [
        { index: { _index: this.productIndex, _id: product.id } },
        product
      ])

      const response = await this.client.bulk({
        body,
        refresh: true
      })

      if (response.errors) {
        console.error('Bulk indexing errors:', response.items)
      }

      return response
    } catch (error) {
      console.error('Error batch indexing products:', error)
      throw error
    }
  }

  async deleteProduct(productId: string) {
    try {
      await this.client.delete({
        index: this.productIndex,
        id: productId
      })
    } catch (error) {
      if (error.meta?.statusCode !== 404) {
        console.error('Error deleting product:', error)
        throw error
      }
    }
  }

  async batchDeleteProducts(productIds: string[]) {
    try {
      const body = productIds.flatMap(id => [
        { delete: { _index: this.productIndex, _id: id } }
      ])

      await this.client.bulk({
        body,
        refresh: true
      })
    } catch (error) {
      console.error('Error batch deleting products:', error)
      throw error
    }
  }

  async searchProducts(params: SearchParams): Promise<SearchResults> {
    try {
      const {
        query = '',
        category_id,
        category,
        collection_id,
        seller_handle,
        locale,
        page,
        limit,
        min_price,
        max_price,
        color,
        size,
        condition,
        sort_by
      } = params

      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [],
          filter: [],
          must_not: []
        }
      }

      // Text search
      if (query) {
        esQuery.bool.must.push({
          multi_match: {
            query,
            fields: [
              'title^3',
              'subtitle^2',
              'description',
              'brand.name^2',
              'tags.value',
              'type.value',
              'categories.name^2',
              'collections.title^2',
              'variants.title'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        })
      } else {
        esQuery.bool.must.push({ match_all: {} })
      }

      // Filters
      esQuery.bool.filter.push({ term: { status: 'published' } })
      esQuery.bool.must_not.push({ term: { 'seller.store_status': 'SUSPENDED' } })
      
      // Filter for products with available inventory
      esQuery.bool.filter.push({
        nested: {
          path: 'variants',
          query: {
            range: { 'variants.inventory_quantity': { gt: 0 } }
          }
        }
      })

      if (locale) {
        esQuery.bool.filter.push({ term: { supported_countries: locale } })
      }

      if (category_id) {
        esQuery.bool.filter.push({ 
          nested: { 
            path: 'categories', 
            query: { term: { 'categories.id': category_id } } 
          } 
        })
      }

      // Filter by category name (for faceted filtering)
      if (category) {
        const categories = category.split(',').filter(Boolean)
        if (categories.length > 0) {
          esQuery.bool.filter.push({
            nested: {
              path: 'categories',
              query: {
                terms: { 'categories.name.keyword': categories }
              }
            }
          })
        }
      }

      if (collection_id) {
        esQuery.bool.filter.push({ 
          nested: { 
            path: 'collections', 
            query: { term: { 'collections.id': collection_id } } 
          } 
        })
      }

      if (seller_handle) {
        esQuery.bool.filter.push({ term: { 'seller.handle': seller_handle } })
      }

      // Color filter
      if (color) {
        const colors = color.split(',').filter(Boolean)
        if (colors.length > 0) {
          esQuery.bool.filter.push({
            nested: {
              path: 'variants',
              query: {
                terms: { 'variants.color.keyword': colors }
              }
            }
          })
        }
      }

      // Size filter
      if (size) {
        const sizes = size.split(',').filter(Boolean)
        if (sizes.length > 0) {
          esQuery.bool.filter.push({
            nested: {
              path: 'variants',
              query: {
                terms: { 'variants.size.keyword': sizes }
              }
            }
          })
        }
      }

      // Condition filter
      if (condition) {
        const conditions = condition.split(',').filter(Boolean)
        if (conditions.length > 0) {
          esQuery.bool.filter.push({
            nested: {
              path: 'variants',
              query: {
                terms: { 'variants.condition.keyword': conditions }
              }
            }
          })
        }
      }

      // Price range filter
      if (min_price || max_price) {
        const priceFilter: any = { range: { 'variants.prices.amount': {} } }
        if (min_price) priceFilter.range['variants.prices.amount'].gte = min_price
        if (max_price) priceFilter.range['variants.prices.amount'].lte = max_price
        esQuery.bool.filter.push({ nested: { path: 'variants.prices', query: priceFilter } })
      }

      // Sorting
      const sort: any[] = []
      if (sort_by) {
        switch (sort_by) {
          case 'price_asc':
            sort.push({ 'variants.prices.amount': { order: 'asc', nested: { path: 'variants.prices' } } })
            break
          case 'price_desc':
            sort.push({ 'variants.prices.amount': { order: 'desc', nested: { path: 'variants.prices' } } })
            break
          case 'rating':
            sort.push({ average_rating: { order: 'desc' } })
            break
          case 'newest':
            sort.push({ created_at: { order: 'desc' } })
            break
          default:
            sort.push({ _score: { order: 'desc' } })
        }
      } else {
        sort.push({ _score: { order: 'desc' } })
      }

      // Build aggregations (facets)
      const aggregations = {
        categories: {
          nested: { path: 'categories' },
          aggs: {
            categories: { terms: { field: 'categories.name.keyword', size: 20 } }
          }
        },
        colors: {
          nested: { path: 'variants' },
          aggs: {
            colors: { terms: { field: 'variants.color.keyword', size: 20 } }
          }
        },
        sizes: {
          nested: { path: 'variants' },
          aggs: {
            sizes: { terms: { field: 'variants.size.keyword', size: 20 } }
          }
        },
        conditions: {
          nested: { path: 'variants' },
          aggs: {
            conditions: { terms: { field: 'variants.condition.keyword', size: 10 } }
          }
        },
        price_ranges: {
          nested: { path: 'variants.prices' },
          aggs: {
            price_stats: { stats: { field: 'variants.prices.amount' } }
          }
        },
        ratings: {
          terms: { field: 'average_rating', size: 5 }
        }
      }

      // Execute search
      const searchResponse = await this.client.search({
        index: this.productIndex,
        body: {
          query: esQuery,
          sort,
          from: (page - 1) * limit,
          size: limit,
          aggs: aggregations,
          _source: true
        }
      })

      // Process results
      const products = searchResponse.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score
      }))

      // Process facets
      const facets = this.processFacets(searchResponse.body.aggregations)

      return {
        products,
        facets,
        total: searchResponse.body.hits.total.value,
        processing_time: searchResponse.body.took
      }

    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  private processFacets(aggregations: any) {
    const facets: Record<string, any> = {}

    if (aggregations.categories?.categories) {
      facets.categories = aggregations.categories.categories.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }))
    }

    if (aggregations.colors?.colors) {
      facets.colors = aggregations.colors.colors.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }))
    }

    if (aggregations.sizes?.sizes) {
      facets.sizes = aggregations.sizes.sizes.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }))
    }

    if (aggregations.conditions?.conditions) {
      facets.conditions = aggregations.conditions.conditions.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }))
    }

    if (aggregations.price_ranges?.price_stats) {
      facets.price_range = {
        min: aggregations.price_ranges.price_stats.min,
        max: aggregations.price_ranges.price_stats.max,
        avg: aggregations.price_ranges.price_stats.avg
      }
    }

    if (aggregations.ratings) {
      facets.ratings = aggregations.ratings.buckets.map((bucket: any) => ({
        value: bucket.key,
        count: bucket.doc_count
      }))
    }

    return facets
  }

  async updateSettings(indexName: string, settings: any) {
    try {
      await this.client.indices.putSettings({
        index: indexName,
        body: { settings }
      })
    } catch (error) {
      console.error(`Error updating settings for ${indexName}:`, error)
      throw error
    }
  }
}

// Default Elasticsearch mapping for products
export const defaultProductMapping = {
  properties: {
    id: { type: 'keyword' },
    title: { 
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
      analyzer: 'standard'
    },
    subtitle: { type: 'text' },
    description: { type: 'text' },
    handle: { type: 'keyword' },
    status: { type: 'keyword' },
    tags: {
      type: 'nested',
      properties: {
        value: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        }
      }
    },
    type: {
      properties: {
        value: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        }
      }
    },
    categories: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        name: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        }
      }
    },
    collections: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        title: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        }
      }
    },
    variants: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        title: { type: 'text' },
        sku: { type: 'keyword' },
        color: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        size: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        condition: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        prices: {
          type: 'nested',
          properties: {
            amount: { type: 'double' },
            currency_code: { type: 'keyword' }
          }
        },
        inventory_quantity: { type: 'integer' }
      }
    },
    seller: {
      properties: {
        id: { type: 'keyword' },
        handle: { type: 'keyword' },
        store_name: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        store_status: { type: 'keyword' }
      }
    },
    brand: {
      properties: {
        id: { type: 'keyword' },
        name: { 
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        }
      }
    },
    average_rating: { type: 'float' },
    supported_countries: { type: 'keyword' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' }
  }
} 