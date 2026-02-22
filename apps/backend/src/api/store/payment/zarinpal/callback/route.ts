import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

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
    console.log('🔵 [Callback] Cart ID from session:', paymentSession.data?.cart_id)

    await paymentModule.updatePaymentSession(paymentSession.id, {
      data: {
        ...paymentSession.data,
        status: 'verified',
        zarinpal_status: status
      }
    })

    console.log('✅ [Callback] Payment session updated')

    const cartId = paymentSession.data?.cart_id

    if (cartId) {
      const redirectUrl = `${process.env.STOREFRONT_URL}/checkout/payment?cart_id=${cartId}&authority=${authority}&verified=true`
      console.log('✅ [Callback] Redirecting to:', redirectUrl)
      return res.redirect(redirectUrl)
    }

    const redirectUrl = `${process.env.STOREFRONT_URL}/checkout/payment?authority=${authority}&verified=true`
    console.log('✅ [Callback] Redirecting to:', redirectUrl)
    return res.redirect(redirectUrl)
  } catch (error: any) {
    console.error('❌ [Callback] Error:', error)
    return res.redirect(`${process.env.STOREFRONT_URL}/checkout/payment?error=verification_failed&message=${encodeURIComponent(error.message)}`)
  }
}

export const AUTHENTICATE = false
