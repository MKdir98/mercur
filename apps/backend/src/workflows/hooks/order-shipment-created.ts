import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  completeOrderWorkflow,
  createOrderShipmentWorkflow,
  getOrderDetailWorkflow
} from '@medusajs/medusa/core-flows'

createOrderShipmentWorkflow.hooks.shipmentCreated(
  async ({ shipment }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [fulfillment]
    } = await query.graph({
      entity: 'fulfillment',
      fields: ['id', 'provider_id', 'order.id', 'labels.*'],
      filters: {
        id: shipment.id
      }
    })

    const order_id = fulfillment.order.id

    const { result: order } = await getOrderDetailWorkflow.run({
      container,
      input: {
        order_id,
        fields: ['payment_status']
      }
    })

    if (order.payment_status === 'captured') {
      await completeOrderWorkflow.run({
        container,
        input: {
          orderIds: [order_id]
        }
      })
    }

    if (fulfillment.provider_id === 'postex') {
      if (fulfillment.labels && fulfillment.labels.length > 0) {
        console.log('🔹 [POSTEX HOOK] Labels already exist, skipping Postex integration')
        return
      }

      console.log('🔹 [POSTEX HOOK] Creating Postex shipment')

      try {
        const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
        const postexService: any = container.resolve('postexFulfillmentService')
        
        if (!postexService) {
          throw new Error('Postex provider not found')
        }

        if (typeof postexService.createPostexShipment !== 'function') {
          throw new Error('PostexService does not have createPostexShipment method')
        }

        const postexShipmentData = await postexService.createPostexShipment(
          fulfillment.order.id,
          fulfillment.id
        )

        console.log('✅ [POSTEX HOOK] Postex shipment created', {
          tracking_number: postexShipmentData.tracking_number,
          parcel_id: postexShipmentData.postex_parcel_id
        })

        await fulfillmentModule.updateFulfillment(fulfillment.id, {
          labels: [{
            tracking_number: postexShipmentData.tracking_number,
            tracking_url: postexShipmentData.tracking_url,
            label_url: postexShipmentData.label_url
          }]
        })

        console.log('✅ [POSTEX HOOK] Fulfillment labels created with Postex tracking')

      } catch (error: any) {
        console.error('❌ [POSTEX HOOK] Error creating Postex shipment', {
          message: error.message,
          stack: error.stack
        })
      }
    }
  }
)
