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

interface RequestPaymentResponse {
  code: number
  message: string
  authority?: string
  fee_type?: string
  fee?: number
}

interface VerifyPaymentResponse {
  code: number
  message: string
  card_hash?: string
  card_pan?: string
  ref_id?: number
  fee_type?: string
  fee?: number
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
    const { amount, currency_code, context } = input

    const contextData = context as any
    const callbackUrl = contextData?.callback_url || process.env.ZARINPAL_CALLBACK_URL

    if (!callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Callback URL is required for Zarinpal payment'
      )
    }

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount as any)

    try {
      const response = await axios.post<RequestPaymentResponse>(
        `${this.baseUrl}/request.json`,
        {
          merchant_id: this.options_.merchantId,
          amount: Math.round(numericAmount * 10),
          description: contextData?.description || 'پرداخت سفارش',
          callback_url: callbackUrl,
          metadata: {
            cart_id: contextData?.cart_id,
            customer_id: context?.customer?.id,
            email: context?.customer?.email,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.code !== 100 || !response.data.authority) {
        throw new Error(`Zarinpal request failed: ${response.data.message}`)
      }

      const paymentData = {
        id: response.data.authority,
        authority: response.data.authority,
        amount,
        currency_code,
        status: 'pending',
        payment_url: `${this.paymentGatewayUrl}/${response.data.authority}`,
      }

      return {
        id: response.data.authority,
        data: paymentData,
      }
    } catch (error: any) {
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
    
    if (paymentData.status === 'verified') {
      return { 
        status: PaymentSessionStatus.AUTHORIZED, 
        data: { ...paymentData, status: 'authorized' } 
      }
    }

    return { status: PaymentSessionStatus.PENDING, data: paymentData }
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
      const response = await axios.post<VerifyPaymentResponse>(
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

      if (response.data.code === 100 || response.data.code === 101) {
        return {
          data: {
            ...paymentSessionData,
            status: 'verified',
            ref_id: response.data.ref_id?.toString(),
            card_pan: response.data.card_pan,
            card_hash: response.data.card_hash,
          },
        }
      } else {
        throw new Error(`Verification failed: ${response.data.message}`)
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
