import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const querySchema = z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'processing', 'completed']).optional(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any

  const { offset, limit, status } = querySchema.parse(req.query)

  const filters: any = {}
  if (status) {
    filters.status = status
  }

  const requests = await walletModule.listWithdrawRequests(filters, {
    skip: offset,
    take: limit,
    order: { created_at: 'DESC' },
  })

  const count = await walletModule.listWithdrawRequests(filters).then(r => r.length)

  res.json({
    requests,
    count,
    offset,
    limit,
  })
}

