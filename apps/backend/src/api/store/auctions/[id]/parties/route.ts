import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any
  const { id } = req.params

  const parties = await auctionModule.listAuctionPartys(
    { auction_id: id },
    { order: { position: 'ASC' } }
  )

  res.json({ parties })
}






