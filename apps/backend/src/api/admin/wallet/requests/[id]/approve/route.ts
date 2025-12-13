import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const { id } = req.params

  const adminId = req.auth_context?.actor_id || 'admin'

  try {
    const approvedRequest = await walletModule.approveWithdraw(id, adminId)

    res.json({
      message: 'درخواست برداشت تایید شد',
      request: approvedRequest,
    })
  } catch (error: any) {
    res.status(400).json({
      message: error.message || 'خطا در تایید درخواست',
    })
  }
}

