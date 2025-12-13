import { MedusaService } from '@medusajs/framework/utils'
import axios from 'axios'
import { ZarinpalTransaction, ZarinpalTransactionStatus } from './models/zarinpal-transaction'

interface ZarinpalConfig {
  merchantId: string
  sandbox: boolean
  callbackUrl?: string
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

class ZarinpalModuleService extends MedusaService({
  ZarinpalTransaction,
}) {
  private merchantId: string
  private sandbox: boolean
  private baseUrl: string
  private paymentGatewayUrl: string

  constructor(container: any, config?: ZarinpalConfig) {
    super(arguments[0], arguments[1])

    this.merchantId = config?.merchantId || process.env.ZARINPAL_MERCHANT_ID || ''
    this.sandbox = config?.sandbox ?? (process.env.ZARINPAL_SANDBOX === 'true')

    if (this.sandbox) {
      this.baseUrl = 'https://sandbox.zarinpal.com/pg/v4/payment'
      this.paymentGatewayUrl = 'https://sandbox.zarinpal.com/pg/StartPay'
    } else {
      this.baseUrl = 'https://payment.zarinpal.com/pg/v4/payment'
      this.paymentGatewayUrl = 'https://payment.zarinpal.com/pg/StartPay'
    }
  }

  async requestPayment(
    amount: number,
    description: string,
    callbackUrl: string,
    metadata?: Record<string, any>
  ) {
    try {
      const response = await axios.post<RequestPaymentResponse>(
        `${this.baseUrl}/request.json`,
        {
          merchant_id: this.merchantId,
          amount: amount * 10,
          description,
          callback_url: callbackUrl,
          metadata: metadata || {},
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

      const transaction = await this.createZarinpalTransactions({
        authority: response.data.authority,
        amount,
        status: ZarinpalTransactionStatus.PENDING,
        callback_url: callbackUrl,
        description,
        metadata,
      })

      return {
        transaction,
        authority: response.data.authority,
        paymentUrl: `${this.paymentGatewayUrl}/${response.data.authority}`,
      }
    } catch (error: any) {
      console.error('Zarinpal requestPayment error:', error.response?.data || error.message)
      throw new Error(`Failed to request payment: ${error.message}`)
    }
  }

  async verifyPayment(authority: string) {
    try {
      const transaction = await this.retrieveZarinpalTransactionByAuthority(authority)

      if (transaction.status === ZarinpalTransactionStatus.VERIFIED) {
        return {
          success: true,
          transaction,
          refId: transaction.ref_id,
          alreadyVerified: true,
        }
      }

      const response = await axios.post<VerifyPaymentResponse>(
        `${this.baseUrl}/verify.json`,
        {
          merchant_id: this.merchantId,
          authority,
          amount: Number(transaction.amount) * 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.code === 100 || response.data.code === 101) {
        await this.updateZarinpalTransactions({
          id: transaction.id,
          status: ZarinpalTransactionStatus.VERIFIED,
          ref_id: response.data.ref_id?.toString(),
          verified_at: new Date(),
          metadata: {
            ...transaction.metadata,
            card_hash: response.data.card_hash,
            card_pan: response.data.card_pan,
          },
        })

        const updatedTransaction = await this.retrieveZarinpalTransaction(transaction.id)

        return {
          success: true,
          transaction: updatedTransaction,
          refId: response.data.ref_id,
          cardPan: response.data.card_pan,
        }
      } else {
        await this.updateZarinpalTransactions({
          id: transaction.id,
          status: ZarinpalTransactionStatus.FAILED,
        })

        return {
          success: false,
          transaction: await this.retrieveZarinpalTransaction(transaction.id),
          message: response.data.message,
        }
      }
    } catch (error: any) {
      console.error('Zarinpal verifyPayment error:', error.response?.data || error.message)
      throw new Error(`Failed to verify payment: ${error.message}`)
    }
  }

  async retrieveZarinpalTransactionByAuthority(authority: string) {
    const transactions = await this.listZarinpalTransactions({ authority })
    
    if (transactions.length === 0) {
      throw new Error('Transaction not found')
    }

    return transactions[0]
  }

  async cancelTransaction(transactionId: string) {
    await this.updateZarinpalTransactions({
      id: transactionId,
      status: ZarinpalTransactionStatus.CANCELLED,
    })

    return await this.retrieveZarinpalTransaction(transactionId)
  }

  async getTransactionStatus(authority: string) {
    const transaction = await this.retrieveZarinpalTransactionByAuthority(authority)
    return transaction.status
  }
}

export default ZarinpalModuleService

