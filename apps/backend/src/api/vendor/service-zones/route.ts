import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  try {
    const { data: serviceZones } = await query.graph({
      entity: "service_zone",
      fields: [
        "id",
        "name",
        "fulfillment_set_id"
      ]
    })

    res.json({ service_zones: serviceZones })
  } catch (error) {
    console.error("Error fetching service zones:", error)
    res.status(500).json({
      type: "internal_error",
      message: "Failed to fetch service zones"
    })
  }
} 