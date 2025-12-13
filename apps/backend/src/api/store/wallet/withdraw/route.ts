import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const withdrawSchema = z.object({
  amount: z.number().positive(),
  sheba_number: z.string().regex(/^IR[0-9]{24}$/, 'Invalid Sheba number format'),
})

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const customerId = req.auth_context.actor_id

  const { amount, sheba_number } = withdrawSchema.parse(req.body)

  const wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    res.status(404).json({ message: 'Wallet not found' })
    return
  }

  try {
    const withdrawRequest = await walletModule.requestWithdraw(
      wallet.id,
      customerId,
      amount,
      sheba_number
    )

    res.json({
      message: 'درخواست برداشت ثبت شد و در انتظار تایید است',
      request: withdrawRequest,
    })
  } catch (error: any) {
    res.status(400).json({
      message: error.message || 'خطا در ثبت درخواست برداشت',
    })
  }
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const customerId = req.auth_context.actor_id

  const wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    res.status(404).json({ message: 'Wallet not found' })
    return
  }

  const requests = await walletModule.listWithdrawRequests(
    { customer_id: customerId },
    { order: { created_at: 'DESC' } }
  )

  res.json({
    requests,
  })
}



