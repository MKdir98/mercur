import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

import {
  ensureSellerPostexShipping,
  fetchSellerByAuthActorId
} from '../../../../../shared/infra/http/utils'

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

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  await ensureSellerPostexShipping(seller.id, id, req.scope)

  // Ensure location is also in the default sales channel
  const { data: salesChannels } = await query.graph({
    entity: 'sales_channel',
    fields: ['id']
  })
  if (salesChannels[0]) {
    try {
      await remoteLink.create({
        [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannels[0].id },
        [Modules.STOCK_LOCATION]: { stock_location_id: id }
      })
    } catch (e: any) {
      if (!e?.message?.includes('duplicate') && !e?.code?.includes('23505')) {
        console.error('⚠️ Failed to link sales channel:', e)
      }
    }
  }

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: req.queryConfig.fields,
    filters: { id }
  })

  res.status(200).json({ stock_location: stockLocation })
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
