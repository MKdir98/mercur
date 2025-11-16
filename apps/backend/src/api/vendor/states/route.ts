import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { VendorGetStatesParamsType } from './validators'

const CITY_MODULE = "city"

export async function GET(
  req: MedusaRequest<VendorGetStatesParamsType>,
  res: MedusaResponse
): Promise<void> {
  const { country_code = 'ir' } = req.validatedQuery
  
  try {
    const cityService = req.scope.resolve(CITY_MODULE) as any
    
    const states = await cityService.listStates({
      country_code
    })
    
    res.json({ states })
  } catch (error) {
    console.error('Error fetching states:', error)
    res.status(500).json({ error: 'Failed to fetch states' })
  }
}
