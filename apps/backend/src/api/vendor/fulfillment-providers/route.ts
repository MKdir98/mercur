import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  try {
    const { data: providers } = await query.graph({
      entity: "fulfillment_provider",
      fields: [
        "id",
        "is_enabled"
      ],
      filters: {
        is_enabled: true
      } as Record<string, unknown>
    })

    res.json({ 
      fulfillment_providers: providers,
      count: providers.length
    })
  } catch (error) {
    console.error("Error fetching fulfillment providers:", error)
    res.status(500).json({
      type: "internal_error",
      message: "Failed to fetch fulfillment providers"
    })
  }
}
