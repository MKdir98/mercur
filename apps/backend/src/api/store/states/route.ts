import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve('query')
  const country_code = (req.query.country_code as string) || 'ir'

  const { data: states } = await query.graph({
    entity: 'state',
    fields: ['id', 'name', 'country_code'],
    filters: { country_code },
    pagination: { take: 200 }
  })

  res.json({ states })
} 