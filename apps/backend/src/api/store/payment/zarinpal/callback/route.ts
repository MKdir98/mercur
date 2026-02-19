import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
  const cartModule = req.scope.resolve(Modules.CART) as any
  
  const { Authority: authority, Status: status } = req.query

  if (!authority || typeof authority !== 'string') {
    return res.redirect(`${process.env.STORE_URL}/checkout/payment?error=invalid_authority`)
  }

  if (status === 'NOK') {
    return res.redirect(`${process.env.STORE_URL}/checkout/payment?error=payment_cancelled`)
  }

  try {
    const paymentCollections = await paymentModule.listPaymentCollections({
      payment_session: {
        data: {
          authority
        }
      }
    })

    if (!paymentCollections || paymentCollections.length === 0) {
      return res.redirect(`${process.env.STORE_URL}/checkout/payment?error=payment_not_found`)
    }

    const paymentCollection = paymentCollections[0]
    const paymentSession = paymentCollection.payment_sessions?.find(
      (session: any) => session.data?.authority === authority
    )

    if (!paymentSession) {
      return res.redirect(`${process.env.STORE_URL}/checkout/payment?error=session_not_found`)
    }

    await paymentModule.updatePaymentSession(paymentSession.id, {
      data: {
        ...paymentSession.data,
        status: 'verified'
      }
    })

    const cartId = paymentSession.data?.cart_id || paymentCollection.context?.cart_id

    if (cartId) {
      return res.redirect(`${process.env.STORE_URL}/checkout/payment?cart_id=${cartId}&authority=${authority}&verified=true`)
    }

    return res.redirect(`${process.env.STORE_URL}/checkout/payment?authority=${authority}&verified=true`)
  } catch (error: any) {
    console.error('Zarinpal callback error:', error)
    return res.redirect(`${process.env.STORE_URL}/checkout/payment?error=verification_failed`)
  }
}
