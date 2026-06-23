import { Client } from 'pg'

import { MedusaResponse } from '@medusajs/framework'
import { AuthenticatedMedusaRequest } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  deleteStockLocationsWorkflow,
  updateStockLocationsWorkflow
} from '@medusajs/medusa/core-flows'

import { IntermediateEvents } from '@mercurjs/framework'
import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingProfileLink from '../../../../links/seller-shipping-profile'
import sellerStockLocationLink from '../../../../links/seller-stock-location'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import { updateStockLocationAddressCityIdWorkflow } from '../../../../workflows/stock-location/workflows'
import { VendorUpdateStockLocationType } from '../validators'

/**
 * @oas [get] /vendor/stock-locations/{id}
 * operationId: "VendorGetStockLocation"
 * summary: "Get Stock Location"
 * description: "Retrieves a Stock Location by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Stock Location
 *     schema:
 *       type: string
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             stock_location:
 *               $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  const addr = stockLocation.address as Record<string, unknown> | undefined

  // city_id is not in Medusa's ORM entity — read it via raw SQL
  if ((addr && (stockLocation as any).address_id) || addr?.id) {
    const addressId = (addr?.id ?? (stockLocation as any).address_id) as string
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL?.replace(
        '$DB_NAME',
        process.env.DB_NAME || 'mercur'
      )
    })
    try {
      await pgClient.connect()
      const { rows } = await pgClient.query(
        'SELECT city_id FROM stock_location_address WHERE id = $1',
        [addressId]
      )
      if (rows[0]?.city_id) {
        addr.city_id = rows[0].city_id
      }
    } catch (e) {
      console.error('Failed to read city_id:', e)
    } finally {
      await pgClient.end()
    }
  }

  if (addr?.city_id) {
    try {
      const {
        data: [city]
      } = await query.graph({
        entity: 'city',
        fields: ['id', 'name', 'state_id', 'state.id', 'state.name'],
        filters: { id: addr.city_id }
      })

      if (city) {
        addr.city_details = city
        addr.state_id = (city as { state_id?: string }).state_id
      }
    } catch (error) {
      console.error('Failed to fetch city details:', error)
    }
  }

  res.status(200).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [post] /vendor/stock-locations/{id}
 * operationId: "VendorUpdateStockLocation"
 * summary: "Update Stock Location"
 * description: "Updates a Stock Location."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Stock Location
 *     schema:
 *       type: string
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorUpdateStockLocation"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             stock_location:
 *               $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateStockLocationType>,
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

  await updateStockLocationsWorkflow(req.scope).run({
    input: {
      selector: { id },
      update: req.validatedBody
    }
  })

  if (req.validatedBody?.address?.city_id) {
    await updateStockLocationAddressCityIdWorkflow(req.scope).run({
      input: {
        stock_location_id: id,
        city_id: req.validatedBody.address.city_id
      }
    })
  }

  // Ensure stock location is linked to default sales channel (required for cart shipping option lookup)
  try {
    const { data: salesChannels } = await query.graph({
      entity: 'sales_channel',
      fields: ['id']
    })
    if (salesChannels[0]) {
      await remoteLink.create({
        [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannels[0].id },
        [Modules.STOCK_LOCATION]: { stock_location_id: id }
      })
    }
  } catch (e: any) {
    // Ignore duplicate link — already linked
    if (!e?.message?.includes('duplicate') && !e?.code?.includes('23505')) {
      console.error('⚠️ Failed to link sales channel to stock location:', e)
    }
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id }
  })

  // Auto-setup PostEx if seller doesn't have it yet
  try {
    const { data: sellerLocations } = await query.graph({
      entity: sellerStockLocationLink.entryPoint,
      fields: [
        'stock_location.id',
        'stock_location.name',
        'stock_location.fulfillment_sets.id',
        'stock_location.fulfillment_sets.type',
        'stock_location.fulfillment_sets.service_zones.id',
        'stock_location.fulfillment_sets.service_zones.shipping_options.provider_id'
      ],
      filters: { seller_id: seller.id }
    })

    const locations = (sellerLocations as any[])
      .map((sl) => sl.stock_location)
      .filter(Boolean)

    const hasPostex = locations.some((loc) =>
      loc.fulfillment_sets?.some((fs: any) =>
        fs.service_zones?.some((sz: any) =>
          sz.shipping_options?.some((so: any) =>
            so.provider_id?.includes('postex_postex')
          )
        )
      )
    )

    if (!hasPostex) {
      const currentLocation = locations.find((loc) => loc.id === id)

      let fulfillmentSetId: string
      const existingFs = currentLocation?.fulfillment_sets?.find(
        (fs: any) => fs.type === 'shipping'
      )

      if (existingFs) {
        fulfillmentSetId = existingFs.id
      } else {
        const [newFs] = await fulfillmentModule.createFulfillmentSets([
          { name: `${currentLocation?.name ?? id} shipping`, type: 'shipping' }
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

      const { data: profileLinks } = await query.graph({
        entity: sellerShippingProfileLink.entryPoint,
        fields: ['shipping_profile.id'],
        filters: { seller_id: seller.id }
      })
      const shippingProfileId = (profileLinks[0] as any)?.shipping_profile?.id

      if (shippingProfileId) {
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
      }

      await remoteLink.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: 'postex_postex' }
      })
    }
  } catch (postexError) {
    console.error('⚠️ PostEx auto-setup failed for location:', id, postexError)
  }

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: { id }
    },
    { throwIfKeyNotFound: true }
  )

  const addrPost = stockLocation.address as Record<string, unknown> | undefined
  if (addrPost?.city_id) {
    try {
      const {
        data: [city]
      } = await query.graph({
        entity: 'city',
        fields: ['id', 'name', 'state_id', 'state.id', 'state.name'],
        filters: { id: addrPost.city_id }
      })
      if (city) {
        addrPost.city_details = city
        addrPost.state_id = (city as { state_id?: string }).state_id
      }
    } catch (error) {
      console.error('Failed to fetch city details:', error)
    }
  }

  res.status(200).json({ stock_location: stockLocation })
}

/**
 * @oas [delete] /vendor/stock-locations/{id}
 * operationId: "VendorDeleteStockLocationById"
 * summary: "Delete stock location"
 * description: "Deletes stock location by id for the authenticated vendor."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the stock location.
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the deleted resource
 *             object:
 *               type: string
 *               description: The type of the object that was deleted
 *             deleted:
 *               type: boolean
 *               description: Whether or not the items were deleted
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteStockLocationsWorkflow(req.scope).run({
    input: {
      ids: [req.params.id]
    }
  })

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: req.params.id }
  })

  res.status(200).json({
    id: req.params.id,
    object: 'stock_location',
    deleted: true
  })
}
