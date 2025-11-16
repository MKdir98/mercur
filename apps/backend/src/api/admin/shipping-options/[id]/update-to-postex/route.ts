import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const shippingOptionId = req.params.id

  console.log('🔧 [UPDATE_POSTEX] Updating shipping option:', shippingOptionId)

  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)

  try {
    const updatedOption = await fulfillmentModule.updateShippingOptions(
      shippingOptionId,
      {
        price_type: 'calculated',
        provider_id: 'postex'
      }
    )

    console.log('✅ [UPDATE_POSTEX] Updated:', updatedOption)

    res.json({ 
      success: true,
      shipping_option: updatedOption 
    })
  } catch (error: any) {
    console.error('❌ [UPDATE_POSTEX] Error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
}









