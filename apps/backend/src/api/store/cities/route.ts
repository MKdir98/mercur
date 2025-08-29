import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve('query')

  const country_code = (req.query.country_code as string) || 'ir'
  const state_id = req.query.state_id as string | undefined

  const filters: any = { country_code }
  if (state_id) {
    filters.state_id = state_id
  }

  const { data: cities } = await query.graph({
    entity: 'city',
    fields: ['id', 'name', 'state_id'],
    filters,
    pagination: { take: 1000 }
  })

  res.json({ cities })
} 