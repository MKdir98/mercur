import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const verifySchema = z.object({
  State: z.string(),
  RefNum: z.string().optional(),
  ResNum: z.string(),
  TraceNo: z.string().optional(),
  Token: z.string().optional(),
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const sepModule = req.scope.resolve('sepModuleService') as any

  const { State, RefNum, ResNum, TraceNo } = verifySchema.parse(req.body)

  if (State !== 'OK') {
    try {
      const transaction = await sepModule.retrieveSepTransactionByResNum(ResNum)
      await sepModule.cancelTransaction(transaction.id)
    } catch (error) {
      console.error('Error cancelling transaction:', error)
    }

    res.status(400).json({
      success: false,
      message: 'پرداخت لغو شد یا با خطا مواجه شد',
      state: State,
    })
    return
  }

  if (!RefNum) {
    res.status(400).json({
      success: false,
      message: 'شماره مرجع یافت نشد',
    })
    return
  }

  try {
    const transaction = await sepModule.retrieveSepTransactionByResNum(ResNum)

    if (transaction.ref_num && transaction.ref_num !== RefNum) {
      res.status(400).json({
        success: false,
        message: 'شماره مرجع نامعتبر است',
      })
      return
    }

    await sepModule.updateSepTransactions(transaction.id, {
      ref_num: RefNum,
      trace_no: TraceNo || null,
    })
  } catch (error) {
    console.error('Error updating transaction with RefNum:', error)
  }

  const verification = await sepModule.verifyPayment(RefNum)

  if (!verification.success) {
    res.status(400).json({
      success: false,
      message: verification.message || 'تایید پرداخت ناموفق بود',
      amount_mismatch: verification.amountMismatch || false,
    })
    return
  }

  const transaction = verification.transaction

  if (transaction.metadata?.wallet_id && !transaction.wallet_transaction_id) {
    const walletTxn = await walletModule.deposit(
      transaction.metadata.wallet_id,
      Number(transaction.amount),
      transaction.id,
      {
        sep_ref_num: verification.refNum,
        sep_trace_no: verification.traceNo,
      }
    )

    await sepModule.updateSepTransactions(transaction.id, {
      wallet_transaction_id: walletTxn.id,
    })
  }

  res.json({
    success: true,
    message: 'واریز به کیف پول با موفقیت انجام شد',
    ref_num: verification.refNum,
    trace_no: verification.traceNo,
    amount: transaction.amount,
  })
}

