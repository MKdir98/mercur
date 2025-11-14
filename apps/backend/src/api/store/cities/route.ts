import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

const CITY_MODULE = "city"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const stateId = req.query.state_id as string
  const countryCode = req.query.country_code as string || 'ir'
  
  if (!stateId) {
    res.status(400).json({ error: 'state_id is required' })
    return
  }
  
  try {
    const cityService = req.scope.resolve(CITY_MODULE)
    
    const cities = await cityService.listCities({
      state_id: stateId,
      country_code: countryCode
    })
    
    res.json({ cities })
  } catch (error) {
    console.error('Error fetching cities:', error)
    res.status(500).json({ error: 'Failed to fetch cities' })
  }
}
