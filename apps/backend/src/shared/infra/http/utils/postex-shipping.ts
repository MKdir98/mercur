import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createShippingProfilesWorkflow } from '@medusajs/medusa/core-flows'

import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingOptionLink from '../../../../links/seller-shipping-option'
import sellerShippingProfileLink from '../../../../links/seller-shipping-profile'
import sellerStockLocationLink from '../../../../links/seller-stock-location'

export async function ensureSellerPostexShipping(
  sellerId: string,
  stockLocationId: string,
  scope: MedusaContainer
): Promise<void> {
  console.log(`🔧 [POSTEX SETUP] sellerId=${sellerId} locationId=${stockLocationId}`)
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const fulfillmentModule = scope.resolve(Modules.FULFILLMENT)

  const { data: sellerLocations } = await query.graph({
    entity: sellerStockLocationLink.entryPoint,
    fields: [
      'stock_location.id',
      'stock_location.name',
      'stock_location.fulfillment_sets.id',
      'stock_location.fulfillment_sets.type',
      'stock_location.fulfillment_sets.service_zones.id',
      'stock_location.fulfillment_sets.service_zones.shipping_options.id',
      'stock_location.fulfillment_sets.service_zones.shipping_options.provider_id'
    ],
    filters: { seller_id: sellerId }
  })

  const locations = (sellerLocations as any[])
    .map((sl) => sl.stock_location)
    .filter(Boolean)

  console.log(`🔧 [POSTEX SETUP] found ${locations.length} locations for seller`)

  const currentLocation = locations.find((loc) => loc.id === stockLocationId)

  console.log(`🔧 [POSTEX SETUP] currentLocation:`, currentLocation?.id, 'fulfillment_sets:', currentLocation?.fulfillment_sets?.length ?? 0)

  const postexShippingOptionsOnLocation = (currentLocation?.fulfillment_sets ?? [])
    .flatMap((fs: any) => fs.service_zones ?? [])
    .flatMap((sz: any) => sz.shipping_options ?? [])
    .filter((so: any) => so.provider_id?.includes('postex_postex'))

  // A shipping option can exist on the location's fulfillment set while the
  // seller's ownership link to it is soft-deleted (e.g. left over from a
  // failed/duplicate setup attempt) — in that case the option is invisible
  // to the seller even though it's fully functional. Check the link itself
  // rather than trusting the raw fulfillment relations.
  let activePostexShippingOptionId: string | undefined
  if (postexShippingOptionsOnLocation.length) {
    const { data: activeLinks } = await query.graph({
      entity: sellerShippingOptionLink.entryPoint,
      fields: ['shipping_option_id'],
      filters: {
        seller_id: sellerId,
        shipping_option_id: postexShippingOptionsOnLocation.map((so: any) => so.id),
        deleted_at: { $eq: null }
      }
    })
    activePostexShippingOptionId = (activeLinks[0] as any)?.shipping_option_id
  }

  console.log(
    `🔧 [POSTEX SETUP] postexShippingOptionsOnLocation=${postexShippingOptionsOnLocation.length} activeLink=${activePostexShippingOptionId ?? 'none'}`
  )

  if (activePostexShippingOptionId) return

  if (postexShippingOptionsOnLocation.length) {
    // The shipping option/service zone/fulfillment set already exist and are
    // fine — only the seller's link to the shipping option is dead. Repair
    // it instead of creating a duplicate shipping option.
    console.log(
      `🔧 [POSTEX SETUP] repairing dead seller-shipping-option link for ${postexShippingOptionsOnLocation[0].id}`
    )
    await remoteLink.create({
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { shipping_option_id: postexShippingOptionsOnLocation[0].id }
    })
    return
  }

  // Get or create fulfillment set
  let fulfillmentSetId: string
  const existingFs = currentLocation?.fulfillment_sets?.find(
    (fs: any) => fs.type === 'shipping'
  )
  if (existingFs) {
    fulfillmentSetId = existingFs.id
  } else {
    const [newFs] = await fulfillmentModule.createFulfillmentSets([
      {
        name: `${stockLocationId} shipping`,
        type: 'shipping'
      }
    ])
    fulfillmentSetId = newFs.id
    await remoteLink.create([
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId }
      },
      {
        [SELLER_MODULE]: { seller_id: sellerId },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId }
      }
    ])
  }

  // Get or create service zone
  let serviceZoneId: string
  const existingSz = existingFs?.service_zones?.[0]
  if (existingSz) {
    serviceZoneId = existingSz.id
  } else {
    const [newSz] = await fulfillmentModule.createServiceZones([
      {
        name: `Iran-${fulfillmentSetId}`,
        fulfillment_set_id: fulfillmentSetId,
        geo_zones: [{ type: 'country', country_code: 'ir' }]
      }
    ])
    serviceZoneId = newSz.id
  }

  // Get shipping profile — create a default one if missing (e.g. seller-created hook failed)
  const { data: profileLinks } = await query.graph({
    entity: sellerShippingProfileLink.entryPoint,
    fields: ['shipping_profile.id'],
    filters: { seller_id: sellerId }
  })
  let shippingProfileId = (profileLinks[0] as any)?.shipping_profile?.id

  if (!shippingProfileId) {
    console.warn(
      `⚠️ Seller ${sellerId} has no shipping profile — creating default`
    )
    const { result: profiles } = await createShippingProfilesWorkflow.run({
      container: scope,
      input: {
        data: [{ type: 'default', name: `${sellerId}:Default shipping profile` }]
      }
    })
    shippingProfileId = profiles[0].id
    await remoteLink.create({
      [SELLER_MODULE]: { seller_id: sellerId },
      [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfileId }
    })
  }

  const [shippingOption] = await fulfillmentModule.createShippingOptions([
    {
      name: 'پست',
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: 'postex_postex',
      price_type: 'calculated',
      type: {
        label: 'پست',
        description: 'ارسال از طریق پستکس',
        code: 'postex-delivery'
      },
      rules: [
        { attribute: 'is_return', operator: 'eq', value: 'false' },
        { attribute: 'enabled_in_store', operator: 'eq', value: 'true' }
      ]
    }
  ])

  await remoteLink.create({
    [SELLER_MODULE]: { seller_id: sellerId },
    [Modules.FULFILLMENT]: { shipping_option_id: shippingOption.id }
  })

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: 'postex_postex' }
  })
}
