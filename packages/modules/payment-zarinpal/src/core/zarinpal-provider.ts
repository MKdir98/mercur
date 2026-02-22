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


abstract class ZarinpalProvider extends AbstractPaymentProvider<Options> {
  protected readonly options_: Options
  protected readonly baseUrl: string
  protected readonly paymentGatewayUrl: string

  constructor(container, options: Options) {
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

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount as any)

    console.log('🟡 [Zarinpal] Initiating payment:', {
      merchantId: this.options_.merchantId,
      amount: numericAmount,
      amountInRials: Math.round(numericAmount * 10),
      callbackUrl,
      baseUrl: this.baseUrl
    })

    try {
      const requestBody = {
        merchant_id: this.options_.merchantId,
        amount: Math.round(numericAmount * 10),
        description: (providerData?.description as string) || 'پرداخت سفارش',
        callback_url: callbackUrl,
        metadata: {
          cart_id: providerData?.cart_id,
          customer_id: context?.customer?.id,
          email: context?.customer?.email,
        },
      }

      console.log('🟡 [Zarinpal] Request body:', requestBody)

      const response = await axios.post<any>(
        `${this.baseUrl}/request.json`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('🟡 [Zarinpal] Response:', response.data)

      const zarinpalData = response.data.data || response.data
      const code = zarinpalData.code
      const authority = zarinpalData.authority

      if (code !== 100 || !authority) {
        console.error('❌ [Zarinpal] Request failed:', response.data)
        throw new Error(`Zarinpal request failed: ${zarinpalData.message || JSON.stringify(response.data)}`)
      }

      console.log('✅ [Zarinpal] Payment initiated successfully:', authority)

      const paymentData = {
        id: authority,
        authority: authority,
        amount,
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
    
    console.log('🟡 [Zarinpal] authorizePayment called with data:', paymentData)
    
    if (paymentData.status === 'authorized' || paymentData.status === 'verified') {
      console.log('✅ [Zarinpal] Payment already authorized/verified')
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

    console.log('🟡 [Zarinpal] Verifying payment with authority:', authority)
    
    try {
      const amountValue = Number(paymentData.amount) || 0
      const response = await axios.post<any>(
        `${this.baseUrl}/verify.json`,
        {
          merchant_id: this.options_.merchantId,
          authority,
          amount: Math.round(amountValue * 10),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const zarinpalData = response.data.data || response.data
      const code = zarinpalData.code

      console.log('🟡 [Zarinpal] Verify response:', zarinpalData)

      if (code === 100 || code === 101) {
        console.log('✅ [Zarinpal] Payment verified successfully')
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
          amount: Math.round(amountValue * 10),
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
