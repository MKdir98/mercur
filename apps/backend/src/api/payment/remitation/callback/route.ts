import axios from "axios"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { remitationGatewayResponseIsPaid } from "@mercurjs/payment-remitation"
import { splitAndCompleteCartWorkflow } from "#/workflows/cart/workflows"
import { getFormattedOrderSetListWorkflow } from "#/workflows/order-set/workflows"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cartIdRaw = req.query.cart_id
  const cartId = typeof cartIdRaw === "string" ? cartIdRaw : undefined

  if (!cartId) {
    return res.redirect(
      `${process.env.STOREFRONT_URL}/checkout/payment?error=invalid_cart`
    )
  }

  const accessKey = process.env.REMITATION_ACCESS_KEY
  const secretKey = process.env.REMITATION_SECRET_KEY
  const baseUrl = (
    process.env.REMITATION_API_BASE_URL ||
    "https://api.merchant.remitation.com/api"
  ).replace(/\/$/, "")

  if (!accessKey || !secretKey) {
    return res.redirect(
      `${process.env.STOREFRONT_URL}/checkout/payment?error=remitation_config`
    )
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "payment_collection.payment_sessions.id",
        "payment_collection.payment_sessions.provider_id",
        "payment_collection.payment_sessions.data",
        "payment_collection.payment_sessions.created_at",
      ],
      filters: { id: cartId },
    })

    const cart = carts?.[0] as Record<string, unknown> | undefined
    const collection = cart?.payment_collection as
      | Record<string, unknown>
      | undefined
    const sessions = (collection?.payment_sessions || []) as Array<
      Record<string, unknown>
    >

    const remSessions = sessions.filter(
      (s) =>
        typeof s.provider_id === "string" &&
        s.provider_id.includes("remitation")
    )

    const latest = remSessions.sort((a, b) => {
      const ca = new Date(String(a.created_at || 0)).getTime()
      const cb = new Date(String(b.created_at || 0)).getTime()
      return cb - ca
    })[0]

    const sessData = latest?.data as Record<string, unknown> | null
    const shortId = (sessData?.authority || sessData?.shortId) as
      | string
      | undefined

    if (!shortId) {
      return res.redirect(
        `${process.env.STOREFRONT_URL}/checkout/payment?error=payment_not_found`
      )
    }

    const statusRes = await axios.get<Record<string, unknown>>(
      `${baseUrl}/api/plugin/payment-gateway/${encodeURIComponent(shortId)}`,
      {
        headers: {
          "x-access-key": accessKey,
          "x-secret-key": secretKey,
        },
        validateStatus: () => true,
      }
    )

    if (statusRes.status >= 400 || !remitationGatewayResponseIsPaid(statusRes.data)) {
      return res.redirect(
        `${process.env.STOREFRONT_URL}/checkout/payment?error=payment_pending`
      )
    }

    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
    const paymentSessions = await paymentModule.listPaymentSessions({
      data: { authority: shortId },
    })
    const paymentSession = paymentSessions?.[0]

    if (!paymentSession) {
      return res.redirect(
        `${process.env.STOREFRONT_URL}/checkout/payment?error=payment_not_found`
      )
    }

    const updatedData = {
      ...paymentSession.data,
      status: "authorized",
      remitation_callback: statusRes.data,
    }

    try {
      await paymentModule.updatePaymentSessions([
        {
          id: paymentSession.id,
          data: updatedData,
        },
      ])
    } catch (updateError: any) {
      console.error("Remitation callback update session:", updateError?.message)
    }

    try {
      await paymentModule.authorizePaymentSession(paymentSession.id, {})
    } catch (authError: any) {
      console.error("Remitation callback authorize:", authError?.message)
    }

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
      return res.redirect(
        `${process.env.STOREFRONT_URL}/order/${orderId}/confirmed`
      )
    }

    return res.redirect(
      `${process.env.STOREFRONT_URL}/checkout/payment?error=no_orders`
    )
  } catch (error: any) {
    console.error("Remitation callback:", error)
    return res.redirect(
      `${process.env.STOREFRONT_URL}/checkout/payment?error=order_failed&message=${encodeURIComponent(error.message)}`
    )
  }
}
