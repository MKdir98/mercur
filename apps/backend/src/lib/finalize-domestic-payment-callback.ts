import { MedusaRequest } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

import { splitAndCompleteCartWorkflow } from '#/workflows/cart/workflows'
import { getFormattedOrderSetListWorkflow } from '#/workflows/order-set/workflows'

export async function finalizeDomesticPaymentFromCallback(
  req: MedusaRequest,
  paymentSession: { id: string; data?: Record<string, unknown> | null },
  nextSessionData: Record<string, unknown>
): Promise<{ orderId: string | null; errorRedirect: string | null }> {
  const storefrontBase = process.env.STOREFRONT_URL || ''
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any

  const mergedData = {
    ...(paymentSession.data || {}),
    ...nextSessionData,
  }

  await paymentModule.updatePaymentSessions([
    {
      id: paymentSession.id,
      data: mergedData,
    },
  ])

  try {
    await paymentModule.authorizePaymentSession(paymentSession.id, {})
  } catch (authError: unknown) {
    const msg = authError instanceof Error ? authError.message : String(authError)
    console.error('[finalizeDomesticPayment] authorizePaymentSession:', msg)
  }

  const cartId = (mergedData.cart_id ?? paymentSession.data?.cart_id) as string | undefined

  if (!cartId) {
    return {
      orderId: null,
      errorRedirect: `${storefrontBase}/checkout/payment?error=no_cart`,
    }
  }

  try {
    const { result } = await splitAndCompleteCartWorkflow(req.scope).run({
      input: { id: cartId },
      context: { transactionId: cartId },
    })

    const {
      result: { data },
    } = await getFormattedOrderSetListWorkflow(req.scope).run({
      input: { filters: { id: result.id } },
    })

    const orderSet = data?.[0]
    const orderId = orderSet?.orders?.[0]?.id

    if (orderId) {
      return { orderId, errorRedirect: null }
    }

    return {
      orderId: null,
      errorRedirect: `${storefrontBase}/checkout/payment?error=no_orders`,
    }
  } catch (completeError: unknown) {
    const msg = completeError instanceof Error ? completeError.message : String(completeError)
    console.error('[finalizeDomesticPayment] complete cart:', msg)
    return {
      orderId: null,
      errorRedirect: `${storefrontBase}/checkout/payment?error=order_failed&message=${encodeURIComponent(msg)}`,
    }
  }
}
