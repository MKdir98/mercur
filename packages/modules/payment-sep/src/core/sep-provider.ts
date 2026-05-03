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
import { resolveSepIpgEndpoints } from '@mercurjs/framework'

type Options = {
  terminalId: string
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

interface RequestTokenResponse {
  status: number
  token?: string
  errorCode?: number
  errorDesc?: string
}

interface VerifyTransactionResponse {
  Success: boolean
  ResultCode: number
  ResultDescription?: string
  TransactionDetail?: {
    OriginalAmount?: number
    AffectiveAmount?: number
    StraceNo?: string
    StraceDate?: string
    RRN?: string
  }
}

abstract class SepProvider extends AbstractPaymentProvider<Options> {
  protected readonly options_: Options
  private readonly tokenUrl: string
  private readonly paymentGatewayPostUrl: string
  private readonly verifyUrl: string

  constructor(container: unknown, options: Options) {
    super(container as Record<string, unknown>)

    this.options_ = options

    const ep = resolveSepIpgEndpoints(options.sandbox)
    this.tokenUrl = ep.tokenUrl
    this.paymentGatewayPostUrl = ep.paymentGatewayPostUrl
    this.verifyUrl = ep.verifyUrl
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
    const callbackUrl = (providerData?.callback_url as string) || process.env.SEP_CALLBACK_URL

    if (!callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Callback URL is required for SEP payment'
      )
    }

    const fallbackAmount = typeof amount === 'number' ? amount : parseFloat(amount as string)
    const ctx = context as Record<string, unknown> | undefined
    const cart = (ctx?.cart ??
      data?.cart ??
      (ctx && 'items' in ctx ? ctx : undefined)) as Record<string, unknown> | undefined
    const numericAmount = computeGatewayAmount(fallbackAmount, cart)

    const cartId = (providerData?.cart_id as string) || ''
    const resNum = `C${cartId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const requestBody: Record<string, unknown> = {
      action: 'token',
      TerminalId: this.options_.terminalId,
      Amount: Math.floor(numericAmount),
      ResNum: resNum,
      RedirectUrl: callbackUrl,
    }

    const cellNumber = providerData?.cell_number as string | undefined
    if (cellNumber) {
      requestBody.CellNumber = cellNumber
    }

    const response = await axios.post<RequestTokenResponse>(this.tokenUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.data.status !== 1 || !response.data.token) {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `SEP request failed: ${response.data.errorDesc || 'Unknown'} (${response.data.errorCode})`
      )
    }

    const token = response.data.token
    const backendBase =
      process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, '') ||
      process.env.BACKEND_URL?.replace(/\/$/, '') ||
      ''

    if (!backendBase) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'MEDUSA_BACKEND_URL is required for SEP checkout redirect'
      )
    }

    const paymentUrl = `${backendBase}/payment/sep/redirect?res_num=${encodeURIComponent(resNum)}`

    const paymentData = {
      id: resNum,
      res_num: resNum,
      sep_token: token,
      sep_post_url: this.paymentGatewayPostUrl,
      amount: numericAmount,
      currency_code,
      status: 'pending',
      payment_url: paymentUrl,
      cart_id: cartId || undefined,
    }

    return {
      id: resNum,
      data: paymentData,
    }
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

    const refNum = paymentData.ref_num as string | undefined
    if (!refNum) {
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }

    const verified = await this.verifySepRef(refNum, paymentData)
    if (!verified.ok) {
      return { status: PaymentSessionStatus.ERROR, data: { ...paymentData, ...verified } }
    }

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...paymentData,
        status: 'authorized',
        ref_num: refNum,
        ...verified.detail,
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
    const refNum = paymentSessionData?.ref_num as string | undefined

    if (!refNum) {
      throw this.buildError('RefNum is required for payment capture', new Error('Missing ref_num'))
    }

    const verified = await this.verifySepRef(refNum, paymentSessionData as Record<string, unknown>)
    if (!verified.ok) {
      throw new Error(verified.message || 'SEP verification failed')
    }

    return {
      data: {
        ...paymentSessionData,
        status: 'verified',
        ...verified.detail,
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

  private async verifySepRef(
    refNum: string,
    paymentData: Record<string, unknown>
  ): Promise<{
    ok: boolean
    message?: string
    detail?: Record<string, unknown>
  }> {
    try {
      const response = await axios.post<VerifyTransactionResponse>(
        this.verifyUrl,
        {
          RefNum: refNum,
          TerminalNumber: parseInt(String(this.options_.terminalId), 10),
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (response.data.Success && response.data.ResultCode === 0) {
        const td = response.data.TransactionDetail
        return {
          ok: true,
          detail: {
            trace_no: td?.StraceNo,
            rrn: td?.RRN,
            verified_amount: td?.OriginalAmount ?? td?.AffectiveAmount,
          },
        }
      }

      return {
        ok: false,
        message: response.data.ResultDescription || 'SEP verify failed',
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

export default SepProvider
