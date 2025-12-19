import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const verifySchema = z.object({
  authority: z.string(),
  status: z.enum(['OK', 'NOK']),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const zarinpalModule = req.scope.resolve('zarinpalModuleService') as any

  const { authority, status } = verifySchema.parse(req.query)

  if (status === 'NOK') {
    await zarinpalModule.cancelTransaction(authority)
    res.status(400).json({
      success: false,
      message: 'پرداخت لغو شد',
    })
    return
  }

  const verification = await zarinpalModule.verifyPayment(authority)

  if (!verification.success) {
    res.status(400).json({
      success: false,
      message: verification.message || 'تایید پرداخت ناموفق بود',
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
        zarinpal_ref_id: verification.refId,
        card_pan: verification.cardPan,
      }
    )

    await zarinpalModule.updateZarinpalTransactions(transaction.id, {
      wallet_transaction_id: walletTxn.id,
    })
  }

  res.json({
    success: true,
    message: 'واریز به کیف پول با موفقیت انجام شد',
    ref_id: verification.refId,
    amount: transaction.amount,
  })
}






