import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any
  const { id } = req.params

  try {
    const auction = await auctionModule.retrieveAuction(id)

    if (!auction.is_enabled) {
      res.status(404).json({ message: 'Auction not found' })
      return
    }

    res.json({ auction })
  } catch (error) {
    res.status(404).json({ message: 'Auction not found' })
  }
}



