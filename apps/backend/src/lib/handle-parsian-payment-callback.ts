import axios from 'axios'
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import { IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT } from '@mercurjs/framework'
import { getParsianGatewayUrls } from '@mercurjs/payment-parsian'

import { finalizeDomesticPaymentFromCallback } from './finalize-domestic-payment-callback'
import { effectiveParsianSandbox } from './iran-payment-sandbox'

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

function readTokenFromUnknownBody(
  body: unknown
): string {
  if (!body) {
    return ''
  }

  if (typeof body === 'string') {
    const parsed = new URLSearchParams(body)
    const token = parsed.get('Token') || parsed.get('token')
    return token?.trim() || ''
  }

  if (Buffer.isBuffer(body)) {
    const parsed = new URLSearchParams(body.toString('utf-8'))
    const token = parsed.get('Token') || parsed.get('token')
    return token?.trim() || ''
  }

  if (typeof body === 'object') {
    const record = body as Record<string, unknown>
    const fromBody = record.Token ?? record.token
    if (typeof fromBody === 'string' && fromBody.trim()) {
      return fromBody.trim()
    }
    if (typeof fromBody === 'number' && Number.isFinite(fromBody)) {
      return String(fromBody)
    }
  }

  return ''
}

function extractParsianToken(req: MedusaRequest): string {
  const q = req.query as Record<string, unknown>
  const fromQuery = q.Token ?? q.token
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.trim()
  }

  return readTokenFromUnknownBody(req.body)
}

export async function handleParsianPaymentCallback(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const storefrontBase = process.env.STOREFRONT_URL || ''
  const token = extractParsianToken(req)

  if (!token) {
    res.redirect(`${storefrontBase}/checkout/payment?error=payment_cancelled`)
    return
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
    res.redirect(`${storefrontBase}/checkout/payment?error=payment_not_found`)
    return
  }

  const loginAccount =
    process.env.PARSIAN_PIN ||
    (effectiveParsianSandbox() ? IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT : '')
  if (!loginAccount) {
    res.redirect(`${storefrontBase}/checkout/payment?error=parsian_config`)
    return
  }

  const sessionData = paymentSession.data as Record<string, unknown> | undefined
  const confirmUrl =
    (typeof sessionData?.parsian_confirm_soap_url === 'string' &&
      sessionData.parsian_confirm_soap_url) ||
    getParsianGatewayUrls(effectiveParsianSandbox()).confirmSoapUrl

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConfirmPayment xmlns="https://pec.Shaparak.ir/NewIPGServices/Confirm/ConfirmService">
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
      res.redirect(
        `${storefrontBase}/checkout/payment?error=parsian_confirm_failed&message=${encodeURIComponent(
          parsed.message || String(parsed.status)
        )}`
      )
      return
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
      res.redirect(errorRedirect || `${storefrontBase}/checkout/payment?error=order_failed`)
      return
    }

    res.redirect(`${storefrontBase}/order/${orderId}/confirmed`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    res.redirect(
      `${storefrontBase}/checkout/payment?error=verification_failed&message=${encodeURIComponent(msg)}`
    )
  }
}
