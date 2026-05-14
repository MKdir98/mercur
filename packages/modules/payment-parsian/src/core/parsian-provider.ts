import axios from 'axios'
import {
  ProviderWebhookPayload,
  WebhookActionResult,
} from '@medusajs/framework/types'
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
  isPresent,
} from '@medusajs/framework/utils'
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
} from '@medusajs/types'

import { getParsianGatewayUrls, type ParsianGatewayUrls } from '../parsian-urls'
import { logExternalServiceCall } from '@mercurjs/framework'

type Options = {
  loginAccount: string
  sandbox: boolean
}

const IRAN_VAT_RATE = 0.1

const toNumber = (val: unknown): number => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && val !== null && 'numeric_' in val)
    return (val as { numeric_?: number }).numeric_ ?? 0
  if (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as { toNumber?: () => number }).toNumber === 'function'
  )
    return (val as { toNumber: () => number }).toNumber()
  return Number(val) || 0
}

function computeGatewayAmount(
  fallbackAmount: number,
  cart: Record<string, unknown> | undefined
): number {
  if (!cart || typeof cart !== 'object') return fallbackAmount
  const countryCode = (
    cart.shipping_address as { country_code?: string } | undefined
  )?.country_code?.toLowerCase?.()
  if (countryCode !== 'ir') return fallbackAmount
  const itemSubtotal = toNumber(cart.item_subtotal)
  const shippingTotal = toNumber(cart.shipping_total)
  const taxTotal = toNumber(cart.tax_total)
  const vatAmount = taxTotal > 0 ? taxTotal : Math.round(itemSubtotal * IRAN_VAT_RATE)
  const computedAmount = itemSubtotal + shippingTotal + vatAmount
  if (computedAmount <= 0) return fallbackAmount
  return computedAmount
}

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

function parseSaleResult(xml: string): { status: number; token: string | null; message: string } {
  const block = firstMatch(
    xml,
    /<SalePaymentRequestResult[^>]*>([\s\S]*?)<\/SalePaymentRequestResult>/i
  )
  const inner = block || xml
  const statusStr = firstMatch(inner, /<Status[^>]*>(-?\d+)<\/Status>/i)
  const token = firstMatch(inner, /<Token[^>]*>([^<]*)<\/Token>/i)
  const message = firstMatch(inner, /<Message[^>]*>([^<]*)<\/Message>/i) || ''
  return {
    status: statusStr ? parseInt(statusStr, 10) : -1,
    token: token && token.trim() ? token.trim() : null,
    message,
  }
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

abstract class ParsianProvider extends AbstractPaymentProvider<Options> {
  protected readonly options_: Options
  private readonly urls: ParsianGatewayUrls
  protected container_: any

  constructor(container: unknown, options: Options) {
    super(container as Record<string, unknown>)
    this.container_ = container
    this.options_ = options
    this.urls = getParsianGatewayUrls(options.sandbox)
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = input.data as Record<string, unknown>

    if (data.status === 'verified') {
      return { status: PaymentSessionStatus.CAPTURED, data }
    }

    if (data.status === 'pending') {
      return { status: PaymentSessionStatus.PENDING, data }
    }

    if (data.status === 'authorized') {
      return { status: PaymentSessionStatus.AUTHORIZED, data }
    }

    if (data.status === 'failed') {
      return { status: PaymentSessionStatus.ERROR, data }
    }

    return { status: PaymentSessionStatus.PENDING, data }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context, data } = input

    const providerData = (data || context) as Record<string, unknown>
    const callbackUrl = (providerData?.callback_url as string) || process.env.PARSIAN_CALLBACK_URL

    if (!callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Callback URL is required for Parsian payment'
      )
    }

    const fallbackAmount = typeof amount === 'number' ? amount : parseFloat(amount as string)
    const ctx = context as Record<string, unknown> | undefined
    const cart = (ctx?.cart ??
      data?.cart ??
      (ctx && 'items' in ctx ? ctx : undefined)) as Record<string, unknown> | undefined
    const numericAmount = Math.floor(computeGatewayAmount(fallbackAmount, cart))

    const orderId = Math.floor(Date.now() / 1000) * 100000 + Math.floor(Math.random() * 99999)
    const cartId = (providerData?.cart_id as string) || ''

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SalePaymentRequest xmlns="https://pec.Shaparak.ir/NewIPGServices/Sale/SaleService">
      <requestData>
        <LoginAccount>${escapeXml(this.options_.loginAccount)}</LoginAccount>
        <Amount>${numericAmount}</Amount>
        <OrderId>${orderId}</OrderId>
        <CallBackUrl>${escapeXml(callbackUrl)}</CallBackUrl>
        <AdditionalData>${escapeXml((providerData?.description as string) || 'Order payment')}</AdditionalData>
        <Originator></Originator>
      </requestData>
    </SalePaymentRequest>
  </soap:Body>
</soap:Envelope>`

    const start = Date.now()
    const response = await axios.post(this.urls.saleSoapUrl, soapBody, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://tempuri.org/SalePaymentRequest',
      },
      validateStatus: () => true,
    })
    const parsed = parseSaleResult(typeof response.data === 'string' ? response.data : String(response.data))

    if (parsed.status !== 0 || !parsed.token) {
      const errMsg = `Parsian sale failed: ${parsed.message || parsed.status}`
      await logExternalServiceCall(this.container_, {
        service_name: 'parsian',
        action: 'initiatePayment',
        endpoint: this.urls.saleSoapUrl,
        status: 'error',
        request_data: { order_id: orderId, amount: numericAmount, cart_id: cartId },
        response_data: { status: parsed.status, message: parsed.message },
        duration_ms: Date.now() - start,
        error_message: errMsg,
      })
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        errMsg
      )
    }

    const paymentData = {
      id: String(orderId),
      parsian_order_id: orderId,
      parsian_token: parsed.token,
      parsian_confirm_soap_url: this.urls.confirmSoapUrl,
      amount: numericAmount,
      currency_code,
      status: 'pending',
      payment_url: `${this.urls.paymentPageTokenPrefix}${parsed.token}`,
      cart_id: cartId || undefined,
    }

    await logExternalServiceCall(this.container_, {
      service_name: 'parsian',
      action: 'initiatePayment',
      endpoint: this.urls.saleSoapUrl,
      status: 'success',
      request_data: { order_id: orderId, amount: numericAmount, cart_id: cartId },
      response_data: { status: parsed.status, has_token: !!parsed.token },
      duration_ms: Date.now() - start,
    })

    return { id: String(orderId), data: paymentData }
  }

  async authorizePayment(
    data: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const paymentData = data.data as Record<string, unknown>

    if (paymentData.status === 'authorized' || paymentData.status === 'verified') {
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: { ...paymentData, status: 'authorized' },
      }
    }

    const token = paymentData.parsian_token as string | undefined
    if (!token) {
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }

    const start = Date.now()
    const confirmed = await this.confirmParsianToken(token)

    if (!confirmed.ok) {
      await logExternalServiceCall(this.container_, {
        service_name: 'parsian',
        action: 'authorizePayment',
        endpoint: this.urls.confirmSoapUrl,
        status: 'error',
        request_data: { has_token: !!token },
        duration_ms: Date.now() - start,
        error_message: confirmed.message,
      })
      return {
        status: PaymentSessionStatus.ERROR,
        data: { ...paymentData, error: confirmed.message },
      }
    }

    await logExternalServiceCall(this.container_, {
      service_name: 'parsian',
      action: 'authorizePayment',
      endpoint: this.urls.confirmSoapUrl,
      status: 'success',
      request_data: { has_token: !!token },
      response_data: { rrn: confirmed.rrn },
      duration_ms: Date.now() - start,
    })

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...paymentData,
        status: 'authorized',
        parsian_rrn: confirmed.rrn,
      },
    }
  }

  async cancelPayment({ data: paymentSessionData }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...paymentSessionData,
        status: 'cancelled',
      },
    }
  }

  async capturePayment({
    data: paymentSessionData,
  }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const token = paymentSessionData?.parsian_token as string | undefined

    if (!token) {
      throw this.buildError('Parsian token is required for capture', new Error('Missing token'))
    }

    const start = Date.now()
    const confirmed = await this.confirmParsianToken(token)

    if (!confirmed.ok) {
      await logExternalServiceCall(this.container_, {
        service_name: 'parsian',
        action: 'capturePayment',
        endpoint: this.urls.confirmSoapUrl,
        status: 'error',
        request_data: { has_token: !!token },
        duration_ms: Date.now() - start,
        error_message: confirmed.message || 'Parsian confirm failed',
      })
      throw new Error(confirmed.message || 'Parsian confirm failed')
    }

    await logExternalServiceCall(this.container_, {
      service_name: 'parsian',
      action: 'capturePayment',
      endpoint: this.urls.confirmSoapUrl,
      status: 'success',
      request_data: { has_token: !!token },
      response_data: { rrn: confirmed.rrn },
      duration_ms: Date.now() - start,
    })

    return {
      data: {
        ...paymentSessionData,
        status: 'verified',
        parsian_rrn: confirmed.rrn,
      },
    }
  }

  deletePayment(data: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(data)
  }

  async refundPayment({ data: paymentSessionData }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: paymentSessionData }
  }

  async retrievePayment({
    data: paymentSessionData,
  }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: paymentSessionData }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const { data, amount } = input

    if (isPresent(amount) && data?.amount === amount) {
      return { data }
    }

    return {
      data: {
        ...data,
        amount,
      },
    }
  }

  async getWebhookActionAndData(
    _webhookData: ProviderWebhookPayload['payload']
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private async confirmParsianToken(token: string): Promise<{
    ok: boolean
    rrn?: string | null
    message?: string
  }> {
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConfirmPayment xmlns="https://pec.Shaparak.ir/NewIPGServices/Confirm/ConfirmService">
      <requestData>
        <LoginAccount>${escapeXml(this.options_.loginAccount)}</LoginAccount>
        <Token>${escapeXml(token)}</Token>
      </requestData>
    </ConfirmPayment>
  </soap:Body>
</soap:Envelope>`

    try {
      const response = await axios.post(this.urls.confirmSoapUrl, soapBody, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'http://tempuri.org/ConfirmPayment',
        },
        validateStatus: () => true,
      })

      const raw = typeof response.data === 'string' ? response.data : String(response.data)
      const parsed = parseConfirmResult(raw)

      if (parsed.status === 0 && parsed.rrn && Number(parsed.rrn) > 0) {
        return { ok: true, rrn: parsed.rrn }
      }

      return {
        ok: false,
        message: parsed.message || `Parsian confirm status ${parsed.status}`,
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return { ok: false, message: msg }
    }
  }

  private buildError(message: string, error: Error) {
    return new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      `${message}: ${error.message || error}`
    )
  }
}

export default ParsianProvider
