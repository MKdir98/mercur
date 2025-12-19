import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any
  const { id } = req.params

  const activeParty = await auctionModule.getActivePartyForAuction(id)

  if (!activeParty) {
    res.status(404).json({ message: 'No active party found' })
    return
  }

  res.json({ party: activeParty })
}






