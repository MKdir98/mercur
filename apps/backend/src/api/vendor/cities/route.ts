import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { VendorGetCitiesParamsType } from './validators'

const CITY_MODULE = "city"

export async function GET(
  req: MedusaRequest<VendorGetCitiesParamsType>,
  res: MedusaResponse
): Promise<void> {
  const { state_id, country_code = 'ir' } = req.validatedQuery
  
  try {
    const cityService = req.scope.resolve(CITY_MODULE) as any
    
    const filters: any = { country_code }
    if (state_id) {
      filters.state_id = state_id
    }
    
    const cities = await cityService.listCities(filters)
    
    res.json({ cities })
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({ error: 'Failed to fetch cities' })
  }
}
