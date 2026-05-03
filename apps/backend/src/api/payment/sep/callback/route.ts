import axios from 'axios'
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

import {
  IRAN_BANKTEST_SEP_CREDENTIALS,
  resolveSepIpgEndpoints,
} from '@mercurjs/framework'

import { finalizeDomesticPaymentFromCallback } from '../../../../lib/finalize-domestic-payment-callback'
import { effectiveSepSandbox } from '../../../../lib/iran-payment-sandbox'

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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storefrontBase = process.env.STOREFRONT_URL || ''
  const body = (req.body || {}) as Record<string, unknown>
  const State = String(body.State ?? '')
  const RefNum = typeof body.RefNum === 'string' ? body.RefNum : ''
  const ResNum = typeof body.ResNum === 'string' ? body.ResNum : ''
  const TraceNo = typeof body.TraceNo === 'string' ? body.TraceNo : ''

  if (State !== 'OK' || !ResNum) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=payment_cancelled`)
  }

  if (!RefNum) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=invalid_ref`)
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    listPaymentSessions: (q: { data: Record<string, string> }) => Promise<
      { id: string; data?: Record<string, unknown> }[]
    >
  }

  const paymentSessions = await paymentModule.listPaymentSessions({
    data: { res_num: ResNum },
  })

  const paymentSession = paymentSessions?.[0]
  if (!paymentSession) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=payment_not_found`)
  }

  const terminalId =
    process.env.SEP_TERMINAL_ID ||
    (effectiveSepSandbox() ? IRAN_BANKTEST_SEP_CREDENTIALS.terminalId : '')
  if (!terminalId) {
    return res.redirect(`${storefrontBase}/checkout/payment?error=sep_config`)
  }

  try {
    const response = await axios.post<VerifyTransactionResponse>(
      resolveSepIpgEndpoints(effectiveSepSandbox()).verifyUrl,
      {
        RefNum,
        TerminalNumber: parseInt(terminalId, 10),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )

    if (!response.data.Success || response.data.ResultCode !== 0) {
      return res.redirect(
        `${storefrontBase}/checkout/payment?error=sep_verify_failed&message=${encodeURIComponent(
          response.data.ResultDescription || 'verify failed'
        )}`
      )
    }

    const td = response.data.TransactionDetail
    const nextData = {
      status: 'authorized' as const,
      ref_num: RefNum,
      trace_no: TraceNo || td?.StraceNo || undefined,
      sep_state: State,
      rrn: td?.RRN,
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
