import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const depositSchema = z.object({
  amount: z.number().positive(),
  callback_url: z.string().url(),
})

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const zarinpalModule = req.scope.resolve('zarinpalModuleService') as any
  const customerId = req.auth_context.actor_id

  const { amount, callback_url } = depositSchema.parse(req.body)

  let wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    wallet = await walletModule.createWalletForCustomer(customerId)
  }

  const payment = await zarinpalModule.requestPayment(
    amount,
    `شارژ کیف پول`,
    callback_url,
    {
      wallet_id: wallet.id,
      customer_id: customerId,
      type: 'deposit',
    }
  )

  res.json({
    authority: payment.authority,
    payment_url: payment.paymentUrl,
    transaction_id: payment.transaction.id,
  })
}

