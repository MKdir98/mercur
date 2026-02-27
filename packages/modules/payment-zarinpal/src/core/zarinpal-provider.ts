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

type Options = {
  merchantId: string
  sandbox: boolean
}

const IRAN_VAT_RATE = 0.1

const toNumber = (val: unknown): number => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && val !== null && 'numeric_' in val) return (val as { numeric_?: number }).numeric_ ?? 0
  if (typeof val === 'object' && val !== null && typeof (val as { toNumber?: () => number }).toNumber === 'function') return (val as { toNumber: () => number }).toNumber()
  return Number(val) || 0
}

function computeGatewayAmount(
  fallbackAmount: number,
  cart: Record<string, unknown> | undefined
): number {
  if (!cart || typeof cart !== 'object') return fallbackAmount
  const countryCode = (cart.shipping_address as { country_code?: string } | undefined)?.country_code?.toLowerCase?.()
  if (countryCode !== 'ir') return fallbackAmount
  const itemSubtotal = toNumber(cart.item_subtotal)
  const shippingTotal = toNumber(cart.shipping_total)
  const taxTotal = toNumber(cart.tax_total)
  const vatAmount = taxTotal > 0 ? taxTotal : Math.round(itemSubtotal * IRAN_VAT_RATE)
  const computedAmount = itemSubtotal + shippingTotal + vatAmount
  if (computedAmount <= 0) return fallbackAmount
  return computedAmount
}

abstract class ZarinpalProvider extends AbstractPaymentProvider<Options> {
  protected readonly options_: Options
  protected readonly baseUrl: string
  protected readonly paymentGatewayUrl: string

  constructor(container: any, options: Options) {
    super(container)

    this.options_ = options

    if (options.sandbox) {
      this.baseUrl = 'https://sandbox.zarinpal.com/pg/v4/payment'
      this.paymentGatewayUrl = 'https://sandbox.zarinpal.com/pg/StartPay'
    } else {
      this.baseUrl = 'https://payment.zarinpal.com/pg/v4/payment'
      this.paymentGatewayUrl = 'https://payment.zarinpal.com/pg/StartPay'
    }
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
    const callbackUrl = (providerData?.callback_url as string) || process.env.ZARINPAL_CALLBACK_URL

    if (!callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Callback URL is required for Zarinpal payment'
      )
    }

    const fallbackAmount = typeof amount === 'number' ? amount : parseFloat(amount as string)
    const ctx = context as Record<string, unknown> | undefined
    const cart = (ctx?.cart ?? data?.cart ?? (ctx && 'items' in ctx ? ctx : undefined)) as Record<string, unknown> | undefined
    const numericAmount = computeGatewayAmount(fallbackAmount, cart)

    try {
      const requestBody = {
        merchant_id: this.options_.merchantId,
        amount: Math.round(numericAmount),
        description: (providerData?.description as string) || 'پرداخت سفارش',
        callback_url: callbackUrl,
        metadata: {
          cart_id: providerData?.cart_id,
          customer_id: context?.customer?.id,
          email: context?.customer?.email,
        },
      }

      const response = await axios.post<any>(
        `${this.baseUrl}/request.json`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const zarinpalData = response.data.data || response.data
      const code = zarinpalData.code
      const authority = zarinpalData.authority

      if (code !== 100 || !authority) {
        console.error('❌ [Zarinpal] Request failed:', response.data)
        throw new Error(`Zarinpal request failed: ${zarinpalData.message || JSON.stringify(response.data)}`)
      }

      const paymentData = {
        id: authority,
        authority: authority,
        amount: numericAmount,
        currency_code,
        status: 'pending',
        payment_url: `${this.paymentGatewayUrl}/${authority}`,
      }

      return {
        id: authority,
        data: paymentData,
      }
    } catch (error: any) {
      console.error('❌ [Zarinpal] Exception in initiatePayment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      throw this.buildError(
        'An error occurred in initiatePayment',
        error
      )
    }
  }

  async authorizePayment(
    data: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const paymentData = data.data as Record<string, unknown>
    
    if (paymentData.status === 'authorized' || paymentData.status === 'verified') {
      return { 
        status: PaymentSessionStatus.AUTHORIZED, 
        data: { ...paymentData, status: 'authorized' } 
      }
    }

    const authority = paymentData.authority as string
    if (!authority) {
      console.error('❌ [Zarinpal] No authority in payment data')
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }

    try {
      const amountValue = Number(paymentData.amount) || 0
      const response = await axios.post<any>(
        `${this.baseUrl}/verify.json`,
        {
          merchant_id: this.options_.merchantId,
          authority,
          amount: Math.round(amountValue),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const zarinpalData = response.data.data || response.data
      const code = zarinpalData.code

      if (code === 100 || code === 101) {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {
            ...paymentData,
            status: 'authorized',
            ref_id: zarinpalData.ref_id?.toString(),
            card_pan: zarinpalData.card_pan,
            card_hash: zarinpalData.card_hash,
          },
        }
      } else {
        console.error('❌ [Zarinpal] Verification failed:', zarinpalData)
        return { 
          status: PaymentSessionStatus.ERROR, 
          data: { ...paymentData, error: zarinpalData.message } 
        }
      }
    } catch (error: any) {
      console.error('❌ [Zarinpal] Exception in authorizePayment:', error.message)
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }
  }

  async cancelPayment({
    data: paymentSessionData,
  }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { 
      data: { 
        ...paymentSessionData, 
        status: 'cancelled' 
      } 
    }
  }

  async capturePayment({
    data: paymentSessionData,
  }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const authority = paymentSessionData?.authority as string

    if (!authority) {
      throw this.buildError(
        'Authority is required for payment capture',
        new Error('Missing authority')
      )
    }

    try {
      const amountValue = Number(paymentSessionData?.amount) || 0
      const response = await axios.post<any>(
        `${this.baseUrl}/verify.json`,
        {
          merchant_id: this.options_.merchantId,
          authority,
          amount: Math.round(amountValue),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const zarinpalData = response.data.data || response.data
      const code = zarinpalData.code

      if (code === 100 || code === 101) {
        return {
          data: {
            ...paymentSessionData,
            status: 'verified',
            ref_id: zarinpalData.ref_id?.toString(),
            card_pan: zarinpalData.card_pan,
            card_hash: zarinpalData.card_hash,
          },
        }
      } else {
        throw new Error(`Verification failed: ${zarinpalData.message}`)
      }
    } catch (error: any) {
      throw this.buildError('An error occurred in capturePayment', error)
    }
  }

  deletePayment(data: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(data)
  }

  async refundPayment({
    data: paymentSessionData,
    amount,
  }: RefundPaymentInput): Promise<RefundPaymentOutput> {
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
        amount 
      } 
    }
  }

  async getWebhookActionAndData(
    webhookData: ProviderWebhookPayload['payload']
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private buildError(message: string, error: Error) {
    return new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      `${message}: ${error.message || error}`
    )
  }
}

export default ZarinpalProvider
