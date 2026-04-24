import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeModule = req.scope.resolve(Modules.STORE)
  const stores = await storeModule.listStores()
  const store = stores[0]
  const meta = (store?.metadata ?? {}) as Record<string, unknown>
  const pd = meta.price_display_usd as
    | { toman_per_usd?: unknown; commission_percent?: unknown }
    | undefined
  const toman = pd?.toman_per_usd
  const comm = pd?.commission_percent
  res.json({
    toman_per_usd:
      typeof toman === 'number' && !Number.isNaN(toman) && toman > 0
        ? toman
        : null,
    commission_percent:
      typeof comm === 'number' && !Number.isNaN(comm) ? comm : null
  })
}
