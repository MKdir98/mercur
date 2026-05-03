import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

import { finalizeDomesticPaymentFromCallback } from '../../../../lib/finalize-domestic-payment-callback'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontBase = process.env.STOREFRONT_URL || ''
  const { Authority: authority, Status: status } = req.query

  if (!authority || typeof authority !== 'string') {
    return res.redirect(`${storefrontBase}/checkout/payment?error=invalid_authority`)
  }

  if (status === 'NOK') {
    return res.redirect(`${storefrontBase}/checkout/payment?error=payment_cancelled`)
  }

  try {
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
      listPaymentSessions: (q: { data: { authority: string } }) => Promise<
        { id: string; data?: Record<string, unknown> }[]
      >
    }

    const paymentSessions = await paymentModule.listPaymentSessions({
      data: { authority },
    })

    if (!paymentSessions || paymentSessions.length === 0) {
      return res.redirect(`${storefrontBase}/checkout/payment?error=payment_not_found`)
    }

    const paymentSession = paymentSessions[0]

    const { orderId, errorRedirect } = await finalizeDomesticPaymentFromCallback(
      req,
      paymentSession,
      {
        status: 'authorized',
        zarinpal_status: status,
      }
    )

    if (errorRedirect || !orderId) {
      return res.redirect(errorRedirect || `${storefrontBase}/checkout/payment?error=order_failed`)
    }

    return res.redirect(`${storefrontBase}/order/${orderId}/confirmed`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return res.redirect(
      `${storefrontBase}/checkout/payment?error=verification_failed&message=${encodeURIComponent(msg)}`
    )
  }
}
