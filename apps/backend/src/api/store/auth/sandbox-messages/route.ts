/**
 * دریافت لیست پیامک‌های sandbox (فقط برای local/demo)
 * Get list of sandbox SMS messages (local/demo only)
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SmsIrService } from "../../../../lib/sms/sms-ir.service"

/**
 * @oas [get] /store/auth/sandbox-messages
 * operationId: "GetSandboxMessages"
 * summary: "Get sandbox SMS messages (local/demo only)"
 * description: "Returns list of SMS messages sent in sandbox mode for testing"
 * x-authenticated: false
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             messages:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   code:
 *                     type: string
 *                   timestamp:
 *                     type: number
 *                   expiresAt:
 *                     type: number
 *   "404":
 *     description: Not available in production
 * tags:
 *   - Store - Auth
 */
export async function GET(
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

  try {
    const messages = SmsIrService.getSandboxMessages()

    res.json({
      success: true,
      messages,
      count: messages.length,
    })
  } catch (error) {
    console.error("Get sandbox messages error:", error)
    res.status(500).json({
      success: false,
      message: "خطای سرور",
    })
  }
}





