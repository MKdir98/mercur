import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

const CITY_MODULE = "city"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const countryCode = req.query.country_code as string || 'ir'
  
  try {
    const cityService = req.scope.resolve(CITY_MODULE) as any
    
    const states = await cityService.listStates({
      country_code: countryCode
    })
    
    res.json({ states })
  } catch (error) {
    console.error('Error fetching states:', error)
    res.status(500).json({ error: 'Failed to fetch states' })
  }
}
