import { MedusaRequest, MedusaResponse, AuthenticatedMedusaRequest } from '@medusajs/framework'
import { z } from 'zod'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const customerId = req.auth_context.actor_id

  let wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    wallet = await walletModule.createWalletForCustomer(customerId)
  }

  const availableBalance = await walletModule.getAvailableBalance(wallet.id)

  res.json({
    wallet: {
      ...wallet,
      available_balance: availableBalance,
    },
  })
}

