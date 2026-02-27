import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

import { splitAndCompleteCartWorkflow } from '#/workflows/cart/workflows'
import { getFormattedOrderSetListWorkflow } from '#/workflows/order-set/workflows'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  console.log('🔵 [Callback] Zarinpal callback received')
  
  const { Authority: authority, Status: status } = req.query

  console.log('🔵 [Callback] Authority:', authority)
  console.log('🔵 [Callback] Status:', status)

  if (!authority || typeof authority !== 'string') {
    console.error('❌ [Callback] Invalid authority')
    return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=invalid_authority`)
  }

  if (status === 'NOK') {
    console.log('⚠️ [Callback] Payment cancelled by user')
    return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=payment_cancelled`)
  }

  try {
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
    
    console.log('🔵 [Callback] Searching for payment session...')
    
    const paymentSessions = await paymentModule.listPaymentSessions({
      data: {
        authority
      }
    })

    console.log('🔵 [Callback] Found sessions:', paymentSessions?.length || 0)

    if (!paymentSessions || paymentSessions.length === 0) {
      console.error('❌ [Callback] Payment session not found')
      return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=payment_not_found`)
    }

    const paymentSession = paymentSessions[0]
    console.log('🔵 [Callback] Payment session:', paymentSession.id)
    console.log('🔵 [Callback] Payment session data:', paymentSession.data)
    console.log('🔵 [Callback] Cart ID from session:', paymentSession.data?.cart_id)

    const updatedData = {
      ...paymentSession.data,
      status: 'authorized',
      zarinpal_status: status
    }

    console.log('🔵 [Callback] Updating session with data:', updatedData)

    try {
      await paymentModule.updatePaymentSessions([{
        id: paymentSession.id,
        data: updatedData
      }])
      console.log('✅ [Callback] Payment session updated to authorized')
    } catch (updateError: any) {
      console.error('⚠️ [Callback] Update failed:', updateError.message)
    }

    console.log('🔵 [Callback] Authorizing payment session...')
    try {
      await paymentModule.authorizePaymentSession(paymentSession.id, {})
      console.log('✅ [Callback] Payment session authorized')
    } catch (authError: any) {
      console.error('⚠️ [Callback] Authorization failed:', authError.message)
    }

    const cartId = paymentSession.data?.cart_id
    
    if (!cartId) {
      console.error('❌ [Callback] No cart ID found')
      return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=no_cart`)
    }

    console.log('🔵 [Callback] Completing order for cart:', cartId)
    
    try {
      console.log('🔵 [Callback] Running split and complete cart workflow...')
      const { result } = await splitAndCompleteCartWorkflow(req.scope).run({
        input: { id: cartId },
        context: { transactionId: cartId }
      })
      
      console.log('✅ [Callback] Cart completed, order set id:', result.id)
      
      const {
        result: { data }
      } = await getFormattedOrderSetListWorkflow(req.scope).run({
        input: { filters: { id: result.id } }
      })
      
      const orderSet = data?.[0]
      const orderId = orderSet?.orders?.[0]?.id
      
      if (orderId) {
        console.log('✅ [Callback] Order created:', orderId)
        
        const redirectUrl = `${process.env.STOREFRONT_URL}/order/${orderId}/confirmed`
        console.log('✅ [Callback] Redirecting to order confirmation:', redirectUrl)
        return res.redirect(redirectUrl)
      } else {
        console.error('❌ [Callback] No order ID in result:', result)
        return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=no_orders`)
      }
    } catch (completeError: any) {
      console.error('❌ [Callback] Failed to complete order:', completeError.message)
      console.error('❌ [Callback] Error stack:', completeError.stack)
      return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=order_failed&message=${encodeURIComponent(completeError.message)}`)
    }
  } catch (error: any) {
    console.error('❌ [Callback] Error:', error)
    return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=verification_failed&message=${encodeURIComponent(error.message)}`)
  }
}
