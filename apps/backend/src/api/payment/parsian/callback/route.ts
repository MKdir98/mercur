import axios from 'axios'
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import { IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT } from '@mercurjs/framework'
import { getParsianGatewayUrls } from '@mercurjs/payment-parsian'

import { finalizeDomesticPaymentFromCallback } from '../../../../lib/finalize-domestic-payment-callback'
import { effectiveParsianSandbox } from '../../../../lib/iran-payment-sandbox'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function firstMatch(xml: string, re: RegExp): string | null {
  const m = xml.match(re)
  return m ? m[1] : null
}

function parseConfirmResult(xml: string): { status: number; rrn: string | null; message: string } {
  const block = firstMatch(
    xml,
    /<ConfirmPaymentResult[^>]*>([\s\S]*?)<\/ConfirmPaymentResult>/i
  )
  const inner = block || xml
  const statusStr = firstMatch(inner, /<Status[^>]*>(-?\d+)<\/Status>/i)
  const rrnRaw = firstMatch(inner, /<RRN[^>]*>([^<]*)<\/RRN>/i)
  const message = firstMatch(inner, /<Message[^>]*>([^<]*)<\/Message>/i) || ''
  return {
    status: statusStr ? parseInt(statusStr, 10) : -1,
    rrn: rrnRaw && rrnRaw.trim() ? rrnRaw.trim() : null,
    message,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontBase = process.env.STOREFRONT_URL || ''
  const q = req.query as Record<string, unknown>
  const tokenRaw = q.Token ?? q.token
  const token = typeof tokenRaw === 'string' ? tokenRaw : ''

  if (!token) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=payment_cancelled`)
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    listPaymentSessions: (filter: { data: Record<string, string> }) => Promise<
      { id: string; data?: Record<string, unknown> }[]
    >
  }

  const paymentSessions = await paymentModule.listPaymentSessions({
    data: { parsian_token: token },
  })

  const paymentSession = paymentSessions?.[0]
  if (!paymentSession) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=payment_not_found`)
  }

  const loginAccount =
    process.env.PARSIAN_PIN ||
    (effectiveParsianSandbox() ? IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT : '')
  if (!loginAccount) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=parsian_config`)
  }

  const sessionData = paymentSession.data as Record<string, unknown> | undefined
  const confirmUrl =
    (typeof sessionData?.parsian_confirm_soap_url === 'string' &&
      sessionData.parsian_confirm_soap_url) ||
    getParsianGatewayUrls(effectiveParsianSandbox()).confirmSoapUrl

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConfirmPayment xmlns="http://tempuri.org/">
      <requestData>
        <LoginAccount>${escapeXml(loginAccount)}</LoginAccount>
        <Token>${escapeXml(token)}</Token>
      </requestData>
    </ConfirmPayment>
  </soap:Body>
</soap:Envelope>`

  try {
    const response = await axios.post(confirmUrl, soapBody, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://tempuri.org/ConfirmPayment',
      },
      validateStatus: () => true,
    })

    const raw = typeof response.data === 'string' ? response.data : String(response.data)
    const parsed = parseConfirmResult(raw)

    if (parsed.status !== 0 || !parsed.rrn || Number(parsed.rrn) <= 0) {
      return res.redirect(
        `${storefrontBase}/checkout/payment?error=parsian_confirm_failed&message=${encodeURIComponent(
          parsed.message || String(parsed.status)
        )}`
      )
    }

    const nextData = {
      status: 'authorized' as const,
      parsian_rrn: parsed.rrn,
    }

    const { orderId, errorRedirect } = await finalizeDomesticPaymentFromCallback(
      req,
      paymentSession,
      nextData
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

export const AUTHENTICATE = false
