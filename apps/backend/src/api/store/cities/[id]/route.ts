import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

const CITY_MODULE = "city"

export async function GET(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
): Promise<void> {
  const cityService = req.scope.resolve(CITY_MODULE)
  const { id } = req.params

  try {
    const city = await cityService.retrieveCity(id)
    
    if (!city) {
      res.status(404).json({ 
        message: "City not found" 
      })
      return
    }

    res.json({ city })
  } catch (error) {
    console.error('Error retrieving city:', error)
    res.status(500).json({ 
      message: "Failed to retrieve city" 
    })
  }
}

