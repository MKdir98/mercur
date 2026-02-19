import { z } from 'zod'

import { MedusaContainer } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  arrayDifference
} from '@medusajs/framework/utils'

import {
  AlgoliaProductValidator,
  AlgoliaVariantValidator
} from '@mercurjs/framework'
import { getAvgRating } from '@mercurjs/reviews'

import sellerProduct from '../../links/seller-product'

async function selectProductVariantsSupportedCountries(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: 'product_variant',
    fields: ['inventory_items.inventory.location_levels.location_id'],
    filters: {
      product_id
    }
  })

  let location_ids: string[] = []

  for (const variant of variants) {
    const inventory_items =
      (variant.inventory_items ?? []).filter(Boolean).map((item) => item!.inventory).filter(Boolean)
    const locations = inventory_items
      .flatMap((inventory_item) => inventory_item?.location_levels ?? [])
      .map((level) => level?.location_id)
      .filter((id): id is string => id != null)

    location_ids = location_ids.concat(locations)
  }

  const { data: stock_locations } = await query.graph({
    entity: 'stock_location',
    fields: ['fulfillment_sets.service_zones.geo_zones.country_code'],
    filters: {
      id: location_ids
    }
  })

  let country_codes: string[] = []

  for (const location of stock_locations) {
    const fulfillmentSets =
      (location.fulfillment_sets ?? []).filter(Boolean).flatMap((set) => set?.service_zones ?? []) ?? []
    const codes = fulfillmentSets
      .flatMap((sz) => sz?.geo_zones ?? [])
      .map((gz) => gz?.country_code)
      .filter((c): c is string => c != null)

    country_codes = country_codes.concat(codes)
  }

  return [...new Set(country_codes)]
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product]
  } = await query.graph({
    entity: sellerProduct.entryPoint,
    fields: ['seller_id', 'seller.handle', 'seller.store_status'],
    filters: {
      product_id
    }
  })

  return product
    ? {
        id: product.seller_id,
        handle: product.seller.handle,
        store_status: product.seller.store_status
      }
    : null
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status'],
    filters: {
      id: ids
    }
  })

  const published = products.filter((p) => p.status === 'published')
  const other = arrayDifference(products, published)

  return {
    published: published.map((p) => p.id),
    other: other.map((p) => p.id)
  }
}

export async function findAndTransformAlgoliaProducts(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*',
      'categories.name',
      'categories.id',
      'collection.title ',
      'tags.value',
      'type.value',
      'variants.*',
      'variants.options.*',
      'variants.options.prices.*',
      'variants.prices.*',
      'brand.name',
      'options.*',
      'options.values.*',
      'images.*',
      'attribute_values.value',
      'attribute_values.attribute.name',
      'attribute_values.attribute.is_filterable',
      'attribute_values.attribute.ui_component'
    ],
    filters: ids.length
      ? {
          id: ids,
          status: 'published'
        }
      : { status: 'published' }
  })

  for (const product of products) {
    const p = product as Record<string, unknown>
    p.average_rating = await getAvgRating(container, 'product', product.id)
    p.supported_countries = await selectProductVariantsSupportedCountries(container, product.id)
    p.seller = await selectProductSeller(container, product.id)
    p.options = product.options
      ?.map((option) => {
        return (option.values ?? []).map((value) => {
          const entry: Record<string, string> = {}
          entry[option.title.toLowerCase()] = value.value
          return entry
        })
      })
      .flat() ?? []
    product.variants = product.variants || []
    product.variants = product.variants
      ?.map((variant) => {
        return variant.options?.reduce((entry, item) => {
          const opt = item?.option
          if (opt) entry[opt.title.toLowerCase()] = item.value
          return entry
        }, variant)
      })
      .flat()

    p.attribute_values = product.attribute_values?.map((attribute) => {
      const attr = attribute?.attribute
      return {
        name: attr?.name,
        value: attribute?.value,
        is_filterable: attr?.is_filterable,
        ui_component: attr?.ui_component
      }
    })
  }

  return products as any[]
}
