import { MedusaService } from '@medusajs/framework/utils'
import axios from 'axios'
import { SepTransaction, SepTransactionStatus } from './models/sep-transaction'

interface SepConfig {
  terminalId: string
  sandbox: boolean
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

class SepModuleService extends MedusaService({
  SepTransaction,
}) {
  private terminalId: string
  private sandbox: boolean
  private tokenUrl: string
  private paymentGatewayUrl: string
  private verifyUrl: string
  private reverseUrl: string

  constructor(container: any, config?: SepConfig) {
    super(arguments[0], arguments[1])

    this.terminalId = config?.terminalId || process.env.SEP_TERMINAL_ID || ''
    this.sandbox = config?.sandbox ?? (process.env.SEP_SANDBOX === 'true')

    if (this.sandbox) {
      this.tokenUrl = 'https://sandbox.sep.shaparak.ir/onlinepg/onlinepg'
      this.paymentGatewayUrl = 'https://sandbox.sep.shaparak.ir/OnlinePG/OnlinePG'
      this.verifyUrl = 'https://sandbox.sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction'
      this.reverseUrl = 'https://sandbox.sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction'
    } else {
      this.tokenUrl = 'https://sep.shaparak.ir/onlinepg/onlinepg'
      this.paymentGatewayUrl = 'https://sep.shaparak.ir/OnlinePG/OnlinePG'
      this.verifyUrl = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction'
      this.reverseUrl = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction'
    }
  }

  async requestPayment(
    amount: number,
    resNum: string,
    callbackUrl: string,
    metadata?: Record<string, any>,
    cellNumber?: string
  ) {
    try {
      const requestBody: any = {
        action: 'token',
        TerminalId: this.terminalId,
        Amount: Math.floor(amount),
        ResNum: resNum,
        RedirectUrl: callbackUrl,
      }

      if (cellNumber) {
        requestBody.CellNumber = cellNumber
      }

      const response = await axios.post<RequestTokenResponse>(
        this.tokenUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.status !== 1 || !response.data.token) {
        throw new Error(
          `SEP request failed: ${response.data.errorDesc || 'Unknown error'} (Code: ${response.data.errorCode})`
        )
      }

      const transaction = await this.createSepTransactions({
        token: response.data.token,
        res_num: resNum,
        amount,
        status: SepTransactionStatus.PENDING,
        callback_url: callbackUrl,
        description: metadata?.description || null,
        metadata,
      })

      return {
        transaction,
        token: response.data.token,
        paymentUrl: this.paymentGatewayUrl,
      }
    } catch (error: any) {
      console.error('SEP requestPayment error:', error.response?.data || error.message)
      throw new Error(`Failed to request payment: ${error.message}`)
    }
  }

  async verifyPayment(refNum: string) {
    try {
      const transaction = await this.retrieveSepTransactionByRefNum(refNum)

      if (transaction.status === SepTransactionStatus.VERIFIED) {
        return {
          success: true,
          transaction,
          refNum: transaction.ref_num,
          alreadyVerified: true,
        }
      }

      const response = await axios.post<VerifyTransactionResponse>(
        this.verifyUrl,
        {
          RefNum: refNum,
          TerminalNumber: parseInt(this.terminalId),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data.Success && response.data.ResultCode === 0) {
        const transactionDetail = response.data.TransactionDetail
        const verifiedAmount = transactionDetail?.OriginalAmount || transactionDetail?.AffectiveAmount

        if (verifiedAmount && Math.floor(Number(transaction.amount)) !== verifiedAmount) {
          console.error(
            `Amount mismatch: Expected ${transaction.amount}, Got ${verifiedAmount}. Reversing transaction.`
          )

          await this.reverseTransaction(refNum)

          return {
            success: false,
            transaction: await this.retrieveSepTransaction(transaction.id),
            message: 'مبلغ تراکنش با مبلغ درخواستی مطابقت ندارد',
            amountMismatch: true,
          }
        }

        await this.updateSepTransactions({
          id: transaction.id,
          status: SepTransactionStatus.VERIFIED,
          ref_num: refNum,
          trace_no: transactionDetail?.StraceNo || null,
          verified_at: new Date(),
          metadata: {
            ...transaction.metadata,
            trace_date: transactionDetail?.StraceDate,
            rrn: transactionDetail?.RRN,
            verified_amount: verifiedAmount,
          },
        })

        const updatedTransaction = await this.retrieveSepTransaction(transaction.id)

        return {
          success: true,
          transaction: updatedTransaction,
          refNum,
          traceNo: transactionDetail?.StraceNo,
        }
      } else {
        await this.updateSepTransactions({
          id: transaction.id,
          status: SepTransactionStatus.FAILED,
        })

        return {
          success: false,
          transaction: await this.retrieveSepTransaction(transaction.id),
          message: response.data.ResultDescription || 'تایید پرداخت ناموفق بود',
        }
      }
    } catch (error: any) {
      console.error('SEP verifyPayment error:', error.response?.data || error.message)
      throw new Error(`Failed to verify payment: ${error.message}`)
    }
  }

  async reverseTransaction(refNum: string) {
    try {
      const response = await axios.post(
        this.reverseUrl,
        {
          RefNum: refNum,
          TerminalNumber: parseInt(this.terminalId),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const transaction = await this.retrieveSepTransactionByRefNum(refNum)

      await this.updateSepTransactions({
        id: transaction.id,
        status: SepTransactionStatus.REVERSED,
        metadata: {
          ...transaction.metadata,
          reversed_at: new Date().toISOString(),
          reverse_response: response.data,
        },
      })

      return {
        success: true,
        transaction: await this.retrieveSepTransaction(transaction.id),
      }
    } catch (error: any) {
      console.error('SEP reverseTransaction error:', error.response?.data || error.message)
      throw new Error(`Failed to reverse transaction: ${error.message}`)
    }
  }

  async retrieveSepTransactionByToken(token: string) {
    const transactions = await this.listSepTransactions({ token })

    if (transactions.length === 0) {
      throw new Error('Transaction not found')
    }

    return transactions[0]
  }

  async retrieveSepTransactionByRefNum(refNum: string) {
    const transactions = await this.listSepTransactions({ ref_num: refNum })

    if (transactions.length === 0) {
      throw new Error('Transaction not found')
    }

    return transactions[0]
  }

  async retrieveSepTransactionByResNum(resNum: string) {
    const transactions = await this.listSepTransactions({ res_num: resNum })

    if (transactions.length === 0) {
      throw new Error('Transaction not found')
    }

    return transactions[0]
  }

  async cancelTransaction(transactionId: string) {
    await this.updateSepTransactions({
      id: transactionId,
      status: SepTransactionStatus.CANCELLED,
    })

    return await this.retrieveSepTransaction(transactionId)
  }

  async getTransactionStatus(token: string) {
    const transaction = await this.retrieveSepTransactionByToken(token)
    return transaction.status
  }
}

export default SepModuleService


