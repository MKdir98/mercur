import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const querySchema = z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(20),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any
  const { id: partyId } = req.params

  const { offset, limit } = querySchema.parse(req.query)

  const bids = await auctionModule.listBids(
    { party_id: partyId, status: 'accepted' },
    {
      skip: offset,
      take: limit,
      order: { created_at: 'DESC' },
    }
  )

  const count = await auctionModule.listBids({ party_id: partyId, status: 'accepted' }).then(b => b.length)

  res.json({
    bids,
    count,
    offset,
    limit,
  })
}






