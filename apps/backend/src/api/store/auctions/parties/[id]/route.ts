import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any
  const { id } = req.params

  try {
    const party = await auctionModule.retrieveAuctionParty(id)
    res.json({ party })
  } catch (error) {
    res.status(404).json({ message: 'Party not found' })
  }
}






