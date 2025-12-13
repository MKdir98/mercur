import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const querySchema = z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(10),
  status: z.enum(['draft', 'scheduled', 'active', 'ended', 'cancelled']).optional(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auctionModule = req.scope.resolve('auctionModuleService') as any

  const { offset, limit, status } = querySchema.parse(req.query)

  const filters: any = { is_enabled: true }
  if (status) {
    filters.status = status
  } else {
    filters.status = 'active'
  }

  const auctions = await auctionModule.listAuctions(filters, {
    skip: offset,
    take: limit,
    order: { start_date: 'ASC' },
  })

  const count = await auctionModule.listAuctions(filters).then(a => a.length)

  res.json({
    auctions,
    count,
    offset,
    limit,
  })
}



