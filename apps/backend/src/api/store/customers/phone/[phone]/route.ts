/**
 * بررسی وجود شماره تلفن در سیستم
 * Check if a phone number is already registered
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * @oas [get] /store/customers/phone/{phone}
 * operationId: "GetCustomerByPhone"
 * summary: "Check if phone exists"
 * description: "Check if a customer with the given phone number exists"
 * parameters:
 *   - in: path
 *     name: phone
 *     required: true
 *     schema:
 *       type: string
 *     description: "Phone number to check"
 * x-authenticated: false
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             customer:
 *               type: object
 *               nullable: true
 *               properties:
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 * tags:
 *   - Store - Customers
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const phone = req.params.phone as string

  if (!phone) {
    res.status(400).json({
      message: "Phone number is required",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')

  try {
    const query = req.scope.resolve("query")

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "first_name", "last_name", "phone"],
      filters: {
        phone: normalizedPhone,
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
    console.error("Error checking phone:", error)
    res.status(500).json({
      message: "Error checking phone number",
    })
  }
}

