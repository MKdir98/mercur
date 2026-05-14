import axios from "axios"
import {
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { logExternalServiceCall } from "@mercurjs/framework"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
  isPresent,
} from "@medusajs/framework/utils"
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
} from "@medusajs/types"

export type RemitationGatewayCurrency = "USD" | "EUR" | "GBP" | "CAD" | "AUD"
export type RemitationPaymentProviderName = "stripe" | "mollie"

export type RemitationOptions = {
  accessKey: string
  secretKey: string
  baseUrl: string
  provider: RemitationPaymentProviderName
  currency: RemitationGatewayCurrency
  rialPerUsd?: number
}

const IRAN_VAT_RATE = 0.1

function remitationAxiosProxyConfig():
  | { proxy: { protocol: string; host: string; port: number; auth?: { username: string; password: string } } }
  | Record<string, never> {
  const raw = process.env.REMITATION_HTTP_PROXY?.trim()
  if (!raw) {
    return {}
  }
  try {
    const u = new URL(raw)
    const protocol = (u.protocol.replace(":", "") || "http").toLowerCase()
    const port = u.port
      ? parseInt(u.port, 10)
      : protocol === "https"
        ? 443
        : 80
    const proxy: {
      protocol: string
      host: string
      port: number
      auth?: { username: string; password: string }
    } = {
      protocol,
      host: u.hostname,
      port,
    }
    if (u.username || u.password) {
      proxy.auth = {
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
      }
    }
    return { proxy }
  } catch {
    return {}
  }
}

const toNumber = (val: unknown): number => {
  if (val == null) return 0
  if (typeof val === "number") return val
  if (typeof val === "object" && val !== null && "numeric_" in val)
    return (val as { numeric_?: number }).numeric_ ?? 0
  if (
    typeof val === "object" &&
    val !== null &&
    typeof (val as { toNumber?: () => number }).toNumber === "function"
  )
    return (val as { toNumber: () => number }).toNumber()
  return Number(val) || 0
}

function computeCartRialSubtotal(
  fallbackAmount: number,
  cart: Record<string, unknown> | undefined
): number {
  if (!cart || typeof cart !== "object") return fallbackAmount
  const countryCode = (
    cart.shipping_address as { country_code?: string } | undefined
  )?.country_code?.toLowerCase?.()
  if (countryCode !== "ir") return fallbackAmount
  const itemSubtotal = toNumber(cart.item_subtotal)
  const shippingTotal = toNumber(cart.shipping_total)
  const taxTotal = toNumber(cart.tax_total)
  const vatAmount =
    taxTotal > 0 ? taxTotal : Math.round(itemSubtotal * IRAN_VAT_RATE)
  const computedAmount = itemSubtotal + shippingTotal + vatAmount
  if (computedAmount <= 0) return fallbackAmount
  return computedAmount
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function remitationPayloadAsRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null) {
    return null
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return null
    } catch {
      return null
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return null
}

function remitationResponseGatewayNode(
  apiData: unknown
): Record<string, unknown> | null {
  const row = remitationPayloadAsRecord(apiData)
  if (!row) {
    return null
  }
  const data = row.data as Record<string, unknown> | undefined
  if (!data) {
    return row
  }
  const pg = data.paymentGateway as Record<string, unknown> | undefined
  if (pg && typeof pg === "object") {
    return pg
  }
  const nested = data.payment as Record<string, unknown> | undefined
  const pg2 = nested?.paymentGateway as Record<string, unknown> | undefined
  if (pg2 && typeof pg2 === "object") {
    return pg2
  }
  return data
}

export function extractRemitationPaymentLinkAndShortId(
  payload: unknown
): { shortId: string; paymentUrl: string } | null {
  const root = remitationPayloadAsRecord(payload)
  if (!root || root.success === false) {
    return null
  }
  const data = root.data as Record<string, unknown> | undefined
  if (!data) {
    return null
  }
  const pg = data.paymentGateway as Record<string, unknown> | undefined
  if (pg && typeof pg === "object") {
    const shortId =
      pg.shortId != null ? String(pg.shortId).trim() : undefined
    const pi = pg.paymentInfo as Record<string, unknown> | undefined
    const paymentUrlRaw =
      (pi?.paymentLink as string) ||
      (pi?.paymentUrl as string) ||
      (pg.paymentUrl as string) ||
      (pi?.paymentQR as string)
    const paymentUrl =
      paymentUrlRaw != null ? String(paymentUrlRaw).trim() : undefined
    if (shortId && paymentUrl) {
      return { shortId, paymentUrl }
    }
  }
  const payNested = data.payment as Record<string, unknown> | undefined
  const pgN = payNested?.paymentGateway as Record<string, unknown> | undefined
  if (pgN) {
    const shortId = pgN.shortId as string | undefined
    const paymentUrl = pgN.paymentUrl as string | undefined
    if (shortId && paymentUrl) {
      return { shortId, paymentUrl }
    }
  }
  const shortIdFlat =
    data.shortId != null ? String(data.shortId).trim() : undefined
  const paymentUrlFlat =
    (data.paymentUrl as string) ||
    (data.paymentLink as string) ||
    ((data.paymentInfo as Record<string, unknown>)?.paymentLink as string) ||
    ((data.paymentInfo as Record<string, unknown>)?.paymentUrl as string)
  const urlTrim =
    paymentUrlFlat != null ? String(paymentUrlFlat).trim() : undefined
  if (shortIdFlat && urlTrim) {
    return { shortId: shortIdFlat, paymentUrl: urlTrim }
  }
  return null
}

export function remitationGatewayResponseIsPaid(apiData: unknown): boolean {
  const gateway = remitationResponseGatewayNode(apiData)
  if (!gateway) {
    return false
  }
  const statusDates = gateway.statusDates as Record<string, unknown> | undefined
  if (statusDates?.paid) {
    return true
  }
  const state = String(gateway.state || "").toLowerCase()
  if (
    state === "paid" ||
    state === "completed" ||
    state === "succeeded"
  ) {
    return true
  }
  const s = String(gateway.status || "").toLowerCase()
  return s === "paid" || s === "completed" || s === "succeeded"
}

abstract class RemitationProvider extends AbstractPaymentProvider<RemitationOptions> {
  protected readonly options_: RemitationOptions
  protected container_: any

  constructor(container: any, options: RemitationOptions) {
    super(container)
    this.container_ = container
    this.options_ = options
  }

  protected resolvedApiRoot(): string {
    let root = this.options_.baseUrl.replace(/\/+$/, "")
    if (!/\/api$/i.test(root)) {
      root = `${root}/api`
    }
    return root
  }

  protected headers() {
    return {
      "Content-Type": "application/json",
      "x-access-key": this.options_.accessKey,
      "x-secret-key": this.options_.secretKey,
    }
  }

  async fetchGatewayRecord(shortId: string): Promise<Record<string, unknown>> {
    const url = `${this.resolvedApiRoot()}/plugin/payment-gateway/${encodeURIComponent(shortId)}`
    const res = await axios.get<Record<string, unknown>>(url, {
      headers: this.headers(),
      validateStatus: () => true,
      ...remitationAxiosProxyConfig(),
    })
    if (res.status >= 400) {
      throw new Error(
        `Remitation status ${res.status}: ${JSON.stringify(res.data)}`
      )
    }
    return remitationPayloadAsRecord(res.data) ?? {}
  }

  gatewayAmountFromInput(
    amount: InitiatePaymentInput["amount"],
    currency_code: string,
    context: InitiatePaymentInput["context"],
    data: InitiatePaymentInput["data"]
  ): number {
    const fallbackAmount =
      typeof amount === "number" ? amount : parseFloat(String(amount))
    const ctx = context as Record<string, unknown> | undefined
    const cart = (ctx?.cart ??
      data?.cart ??
      (ctx && "items" in ctx ? ctx : undefined)) as
      | Record<string, unknown>
      | undefined
    const cc = (currency_code || "").toLowerCase()
    if (cc === "irr") {
      if (this.options_.currency !== "USD") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "IRR carts require REMITATION_PAYMENT_CURRENCY=USD"
        )
      }
      const rial = Math.round(computeCartRialSubtotal(fallbackAmount, cart))
      const rate = this.options_.rialPerUsd
      if (!rate || rate <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "REMITATION_RIAL_PER_USD is required for IRR carts"
        )
      }
      const usd = roundMoney2(rial / rate)
      return Math.max(0.01, usd)
    }
    if (cc === "usd") {
      const cents = Math.round(fallbackAmount)
      return Math.max(0.01, roundMoney2(cents / 100))
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Remitation gateway does not support cart currency: ${currency_code}`
    )
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = input.data as Record<string, unknown>

    if (data.status === "verified" || data.status === "authorized") {
      return { status: PaymentSessionStatus.AUTHORIZED, data }
    }

    if (data.status === "pending") {
      return { status: PaymentSessionStatus.PENDING, data }
    }

    if (data.status === "failed") {
      return { status: PaymentSessionStatus.ERROR, data }
    }

    return { status: PaymentSessionStatus.PENDING, data }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context, data } = input
    const providerData = (data || context) as Record<string, unknown>
    const cartId = providerData?.cart_id as string | undefined
    if (!cartId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "cart_id is required for Remitation payment"
      )
    }

    const backendBase = (process.env.BACKEND_URL || "").replace(/\/$/, "")
    if (!backendBase) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "BACKEND_URL is required for Remitation redirect"
      )
    }

    const usdAmount = this.gatewayAmountFromInput(
      amount,
      currency_code,
      context,
      data
    )

    const redirectUrl = `${backendBase}/payment/remitation/callback?cart_id=${encodeURIComponent(cartId)}`

    const generateUrl = `${this.resolvedApiRoot()}/plugin/payment-gateway/generate`
    const requestBody = {
      amount: usdAmount,
      currency: this.options_.currency,
      productName: "Order payment",
      desc: (providerData?.description as string) || "Order payment",
      extData: { cart_id: cartId },
      provider: this.options_.provider,
      redirectUrl,
    }
    const start = Date.now()

    try {
      const res = await axios.post<Record<string, unknown>>(
        generateUrl,
        requestBody,
        {
          headers: this.headers(),
          validateStatus: () => true,
          ...remitationAxiosProxyConfig(),
        }
      )

      if (res.status < 200 || res.status >= 300) {
        const errMsg = `Remitation generate failed ${res.status}: ${JSON.stringify(res.data)}`
        await logExternalServiceCall(this.container_, {
          service_name: "remitation",
          action: "initiatePayment",
          endpoint: generateUrl,
          status: "error",
          request_data: { amount: usdAmount, currency: this.options_.currency, cart_id: cartId },
          response_data: res.data as Record<string, unknown>,
          duration_ms: Date.now() - start,
          error_message: errMsg,
        })
        throw new Error(errMsg)
      }

      const extracted = extractRemitationPaymentLinkAndShortId(res.data)
      if (!extracted) {
        const errMsg = `Invalid Remitation response: ${JSON.stringify(res.data)}`
        await logExternalServiceCall(this.container_, {
          service_name: "remitation",
          action: "initiatePayment",
          endpoint: generateUrl,
          status: "error",
          request_data: { amount: usdAmount, currency: this.options_.currency, cart_id: cartId },
          response_data: res.data as Record<string, unknown>,
          duration_ms: Date.now() - start,
          error_message: errMsg,
        })
        throw new Error(errMsg)
      }
      const { shortId, paymentUrl } = extracted

      const paymentData = {
        id: shortId,
        authority: shortId,
        shortId,
        amount: usdAmount,
        gateway_currency: this.options_.currency,
        currency_code,
        status: "pending",
        payment_url: paymentUrl,
        cart_id: cartId,
      }

      await logExternalServiceCall(this.container_, {
        service_name: "remitation",
        action: "initiatePayment",
        endpoint: generateUrl,
        status: "success",
        request_data: { amount: usdAmount, currency: this.options_.currency, cart_id: cartId },
        response_data: { short_id: shortId, has_payment_url: !!paymentUrl },
        duration_ms: Date.now() - start,
      })

      return {
        id: shortId,
        data: paymentData,
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Remitation initiatePayment error:", err?.message || error)
      throw this.buildError("An error occurred in initiatePayment", error as Error)
    }
  }

  async authorizePayment(
    data: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const paymentData = data.data as Record<string, unknown>

    if (
      paymentData.status === "authorized" ||
      paymentData.status === "verified"
    ) {
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: { ...paymentData, status: "authorized" },
      }
    }

    const shortId = (paymentData.authority ||
      paymentData.shortId) as string | undefined
    if (!shortId) {
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }

    const fetchUrl = `${this.resolvedApiRoot()}/plugin/payment-gateway/${encodeURIComponent(shortId)}`
    const start = Date.now()

    try {
      const raw = await this.fetchGatewayRecord(shortId)
      if (!remitationGatewayResponseIsPaid(raw)) {
        return { status: PaymentSessionStatus.PENDING, data: paymentData }
      }
      await logExternalServiceCall(this.container_, {
        service_name: "remitation",
        action: "authorizePayment",
        endpoint: fetchUrl,
        status: "success",
        request_data: { short_id: shortId },
        response_data: { is_paid: true },
        duration_ms: Date.now() - start,
      })
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          ...paymentData,
          status: "authorized",
          remitation_status: raw,
        },
      }
    } catch (error: unknown) {
      console.error("Remitation authorizePayment error:", error)
      await logExternalServiceCall(this.container_, {
        service_name: "remitation",
        action: "authorizePayment",
        endpoint: fetchUrl,
        status: "error",
        request_data: { short_id: shortId },
        duration_ms: Date.now() - start,
        error_message: error instanceof Error ? error.message : String(error),
      })
      return { status: PaymentSessionStatus.ERROR, data: paymentData }
    }
  }

  async cancelPayment({
    data: paymentSessionData,
  }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...paymentSessionData,
        status: "cancelled",
      },
    }
  }

  async capturePayment({
    data: paymentSessionData,
  }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const shortId = (paymentSessionData?.authority ||
      paymentSessionData?.shortId) as string | undefined

    if (!shortId) {
      throw this.buildError(
        "Short id is required for payment capture",
        new Error("Missing shortId")
      )
    }

    const fetchUrl = `${this.resolvedApiRoot()}/plugin/payment-gateway/${encodeURIComponent(shortId)}`
    const start = Date.now()

    const raw = await this.fetchGatewayRecord(shortId)
    if (!remitationGatewayResponseIsPaid(raw)) {
      await logExternalServiceCall(this.container_, {
        service_name: "remitation",
        action: "capturePayment",
        endpoint: fetchUrl,
        status: "error",
        request_data: { short_id: shortId },
        response_data: { is_paid: false },
        duration_ms: Date.now() - start,
        error_message: "Remitation payment is not completed yet",
      })
      throw new Error("Remitation payment is not completed yet")
    }

    await logExternalServiceCall(this.container_, {
      service_name: "remitation",
      action: "capturePayment",
      endpoint: fetchUrl,
      status: "success",
      request_data: { short_id: shortId },
      response_data: { is_paid: true },
      duration_ms: Date.now() - start,
    })

    return {
      data: {
        ...paymentSessionData,
        status: "verified",
        remitation_status: raw,
      },
    }
  }

  deletePayment(data: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(data)
  }

  async refundPayment({
    data: paymentSessionData,
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
        amount,
      },
    }
  }

  async getWebhookActionAndData(
    _webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  private buildError(message: string, error: Error) {
    return new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      `${message}: ${error.message || String(error)}`
    )
  }
}

export default RemitationProvider
