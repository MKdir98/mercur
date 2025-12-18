import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const querySchema = z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(20),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const customerId = req.auth_context.actor_id

  const { offset, limit } = querySchema.parse(req.query)

  const wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    res.status(404).json({ message: 'Wallet not found' })
    return
  }

  const transactions = await walletModule.listWalletTransactions(
    { wallet_id: wallet.id },
    {
      skip: offset,
      take: limit,
      order: { created_at: 'DESC' },
    }
  )

  const count = await walletModule.listWalletTransactions({ wallet_id: wallet.id }).then(t => t.length)

  res.json({
    transactions,
    count,
    offset,
    limit,
  })
}





