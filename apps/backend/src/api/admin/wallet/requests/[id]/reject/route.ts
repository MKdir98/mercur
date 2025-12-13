import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const rejectSchema = z.object({
  reason: z.string().min(1),
})

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const { id } = req.params

  const { reason } = rejectSchema.parse(req.body)
  const adminId = req.auth_context?.actor_id || 'admin'

  try {
    const rejectedRequest = await walletModule.rejectWithdraw(id, adminId, reason)

    res.json({
      message: 'درخواست برداشت رد شد',
      request: rejectedRequest,
    })
  } catch (error: any) {
    res.status(400).json({
      message: error.message || 'خطا در رد درخواست',
    })
  }
}

