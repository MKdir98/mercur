import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingProfileLink from '../../../../../links/seller-shipping-profile'
import { fetchSellerByAuthActorId } from '../../../../../shared/infra/http/utils'

const POSTEX_DEEP_FIELDS = [
  'id',
  'name',
  'fulfillment_sets.id',
  'fulfillment_sets.type',
  'fulfillment_sets.service_zones.id',
  'fulfillment_sets.service_zones.shipping_options.id',
  'fulfillment_sets.service_zones.shipping_options.provider_id'
]

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const {
    data: [location]
  } = await query.graph(
    { entity: 'stock_location', fields: POSTEX_DEEP_FIELDS, filters: { id } },
    { throwIfKeyNotFound: true }
  )

  // Guard: already active
  const alreadyActive = (location as any).fulfillment_sets?.some((fs: any) =>
    fs.service_zones?.some((sz: any) =>
      sz.shipping_options?.some((so: any) =>
        so.provider_id?.includes('postex_postex')
      )
    )
  )
  if (alreadyActive) {
    const {
      data: [updated]
    } = await query.graph({
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: { id }
    })
    return res.status(200).json({ stock_location: updated })
  }

  // Find or create fulfillment set
  let fulfillmentSetId: string
  const existingFs = (location as any).fulfillment_sets?.find(
    (fs: any) => fs.type === 'shipping'
  )

  if (existingFs) {
    fulfillmentSetId = existingFs.id
  } else {
    const [newFs] = await fulfillmentModule.createFulfillmentSets([
      {
        name: `${(location as any).name} shipping`,
        type: 'shipping'
      }
    ])
    fulfillmentSetId = newFs.id
    await remoteLink.create([
      {
        [Modules.STOCK_LOCATION]: { stock_location_id: id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId }
      },
      {
        [SELLER_MODULE]: { seller_id: seller.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId }
      }
    ])
  }

  // Find or create service zone
  let serviceZoneId: string
  const existingSz = existingFs?.service_zones?.[0]

  if (existingSz) {
    serviceZoneId = existingSz.id
  } else {
    const [newSz] = await fulfillmentModule.createServiceZones([
      {
        name: 'Iran',
        fulfillment_set_id: fulfillmentSetId,
        geo_zones: [{ type: 'country', country_code: 'ir' }]
      }
    ])
    serviceZoneId = newSz.id
  }

  // Get seller's shipping profile
  const { data: profileLinks } = await query.graph({
    entity: sellerShippingProfileLink.entryPoint,
    fields: ['shipping_profile.id'],
    filters: { seller_id: seller.id }
  })
  const shippingProfileId = (profileLinks[0] as any)?.shipping_profile?.id

  if (!shippingProfileId) {
    return res
      .status(400)
      .json({ message: 'پروفایل ارسال برای فروشنده یافت نشد' })
  }

  const [shippingOption] = await fulfillmentModule.createShippingOptions([
    {
      name: 'ارسال پستکس',
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: 'postex_postex',
      price_type: 'calculated',
      type: {
        label: 'ارسال پستکس',
        description: 'ارسال از طریق پستکس',
        code: 'postex-delivery'
      }
    }
  ])

  await remoteLink.create({
    [SELLER_MODULE]: { seller_id: seller.id },
    [Modules.FULFILLMENT]: { shipping_option_id: shippingOption.id }
  })

  // Ensure PostEx provider is linked
  await remoteLink.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: 'postex_postex' }
  })

  const {
    data: [updated]
  } = await query.graph({
    entity: 'stock_location',
    fields: req.queryConfig.fields,
    filters: { id }
  })

  res.status(200).json({ stock_location: updated })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)

  const {
    data: [location]
  } = await query.graph(
    { entity: 'stock_location', fields: POSTEX_DEEP_FIELDS, filters: { id } },
    { throwIfKeyNotFound: true }
  )

  const postexOptionIds: string[] = []
  for (const fs of (location as any).fulfillment_sets ?? []) {
    for (const sz of fs.service_zones ?? []) {
      for (const so of sz.shipping_options ?? []) {
        if (so.provider_id?.includes('postex_postex')) {
          postexOptionIds.push(so.id)
        }
      }
    }
  }

  if (postexOptionIds.length > 0) {
    await fulfillmentModule.deleteShippingOptions(postexOptionIds)
  }

  const {
    data: [updated]
  } = await query.graph({
    entity: 'stock_location',
    fields: req.queryConfig.fields,
    filters: { id }
  })

  res.status(200).json({ stock_location: updated })
}
