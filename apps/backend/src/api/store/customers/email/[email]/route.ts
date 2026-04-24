import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { otpSubjectKey } from "../../../../../lib/otp/otp-subject"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const emailParam = req.params.email as string

  if (!emailParam) {
    res.status(400).json({
      message: "Email is required",
    })
    return
  }

  let decoded = emailParam
  try {
    decoded = decodeURIComponent(emailParam)
  } catch {
    decoded = emailParam
  }

  const normalizedEmail = otpSubjectKey("email", decoded)

  try {
    const query = req.scope.resolve("query")

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "first_name", "last_name", "email"],
      filters: {
        email: normalizedEmail,
      },
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    res.json({
      customer: customer
        ? {
            first_name: customer.first_name,
            last_name: customer.last_name,
          }
        : null,
    })
  } catch (error) {
    console.error("Error checking email:", error)
    res.status(500).json({
      message: "Error checking email",
    })
  }
}
