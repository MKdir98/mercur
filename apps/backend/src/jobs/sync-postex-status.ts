import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import PostexService from '../modules/postex/service'
import { createSmsService } from '../lib/sms/sms-ir.service'

export default async function syncPostexStatusJob(container: MedusaContainer) {
  console.log('🔹 [POSTEX SYNC] Starting status sync job')
  
  const postexConfig = {
    apiKey: process.env.POSTEX_API_KEY,
    apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
  }
  
  const postexService = new PostexService(container, postexConfig)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  
  if (!knex) {
    console.error('❌ [POSTEX SYNC] Knex connection not available')
    return
  }
  
  const result = await knex.raw(
    `SELECT id, fulfillment_id, order_id, postex_parcel_id, postex_tracking_code, status
     FROM postex_shipment
     WHERE postex_parcel_id IS NOT NULL
     AND status NOT IN ('delivered', 'canceled', 'returned', 'failed')
     LIMIT 100`
  )
  
  const activeShipments = result.rows || []
  
  if (activeShipments.length === 0) {
    console.log('ℹ️ [POSTEX SYNC] No active shipments to sync')
    return
  }
  
  console.log(`🔹 [POSTEX SYNC] Found ${activeShipments.length} shipments to check`)
  
  for (const shipment of activeShipments) {
    try {
      const statusCode = await postexService.getParcelStatus(shipment.postex_parcel_id)
      
      if (!statusCode) {
        console.warn(`⚠️ [POSTEX SYNC] Could not get status for parcel ${shipment.postex_parcel_id}`)
        continue
      }
      
      let newStatus = shipment.status
      
      switch (statusCode) {
        case 1:
          newStatus = 'payment_pending'
          break
        case 2:
          newStatus = 'pending_seller'
          break
        case 9:
          newStatus = 'ready_to_accept'
          break
        case 3:
          newStatus = 'picked_up'
          try {
            await fulfillmentModule.updateFulfillment(shipment.fulfillment_id, {
              shipped_at: new Date()
            })
            console.log(`✅ [POSTEX SYNC] Updated fulfillment ${shipment.fulfillment_id} to shipped`)
          } catch (error) {
            console.error(`❌ [POSTEX SYNC] Error updating fulfillment to shipped:`, error)
          }
          break
        case 7:
          newStatus = 'delivering'
          break
        case 4:
          newStatus = 'delivered'
          try {
            await fulfillmentModule.updateFulfillment(shipment.fulfillment_id, {
              delivered_at: new Date()
            })
            console.log(`✅ [POSTEX SYNC] Updated fulfillment ${shipment.fulfillment_id} to delivered`)
          } catch (error) {
            console.error(`❌ [POSTEX SYNC] Error updating fulfillment to delivered:`, error)
          }
          break
        case 5:
          newStatus = 'returned'
          break
        case 8:
          newStatus = 'canceled'
          break
      }
      
      if (newStatus !== shipment.status) {
        await knex.raw(
          `UPDATE postex_shipment
           SET status = ?, updated_at = NOW()
           WHERE id = ?`,
          [newStatus, shipment.id]
        )

        console.log(`✅ [POSTEX SYNC] Updated shipment ${shipment.id} status: ${shipment.status} → ${newStatus}`)

        if (newStatus === 'delivering') {
          await sendDeliveringSmsToBuyer(container, shipment.order_id, shipment.postex_tracking_code)
        }
      }
      
    } catch (error) {
      console.error(`❌ [POSTEX SYNC] Error processing shipment ${shipment.id}:`, error)
    }
  }
  
  console.log('✅ [POSTEX SYNC] Status sync job completed')
}

async function sendDeliveringSmsToBuyer(
  container: MedusaContainer,
  orderId: string,
  trackingCode: string | null
) {
  const templateId = process.env.SMS_IR_DELIVERING_TEMPLATE_ID
  if (!templateId || !trackingCode) return

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order]
    } = await query.graph({
      entity: 'order',
      fields: ['customer.phone'],
      filters: { id: orderId }
    })

    const phone = order?.customer?.phone
    if (!phone) return

    const smsService = createSmsService()
    const result = await smsService.sendTemplate(phone, templateId, {
      tracking_code: trackingCode
    })

    if (!result.success) {
      console.error(
        `❌ [POSTEX SYNC] Failed to send delivering SMS to buyer ${phone}:`,
        result.error
      )
    } else {
      console.log(`✅ [POSTEX SYNC] Sent delivering SMS to buyer ${phone}`)
    }
  } catch (error) {
    console.error(`❌ [POSTEX SYNC] Error sending delivering SMS for order ${orderId}:`, error)
  }
}

export const config = {
  name: 'sync-postex-status',
  schedule: '*/30 * * * *'
}

