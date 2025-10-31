/**
 * پاک کردن OTP store (فقط برای local/demo)
 * Clear OTP store for testing (local/demo only)
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteOTP } from "../../../../lib/otp/otp-store"

/**
 * @oas [post] /store/auth/clear-otp
 * operationId: "ClearOTP"
 * summary: "Clear OTP (local/demo only)"
 * description: "Clears stored OTP for a phone number (for testing purposes only)"
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - phone
 *         properties:
 *           phone:
 *             type: string
 * x-authenticated: false
 * responses:
 *   "200":
 *     description: OK
 *   "404":
 *     description: Not available in production
 * tags:
 *   - Store - Auth
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  // فقط در local/demo
  const isLocal = process.env.APP_ENV === 'local' || process.env.APP_ENV === 'demo'
  
  if (!isLocal) {
    res.status(404).json({
      success: false,
      message: "Not available in production",
    })
    return
  }

  const { phone } = req.body as { phone?: string }

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  
  // پاک کردن OTP
  deleteOTP(normalizedPhone)

  res.json({
    success: true,
    message: "OTP پاک شد - می‌تونی دوباره درخواست بدی",
  })
}





