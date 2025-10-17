import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Simple in-memory store for demo/local
const store = new Map<string, { code: string; timestamp: number }>()

function isSandbox() {
  const env = process.env.APP_ENV || process.env.NODE_ENV || 'development'
  return env === 'local' || env === 'demo' || env === 'development'
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * @oas [get] /admin/sms/sandbox
 * operationId: "AdminSandboxGetOtp"
 * summary: "Generate and return OTP for a phone (sandbox)"
 * description: "Generates a 6-digit OTP for the given phone and returns it (Only in local/demo)"
 * parameters:
 *   - in: query
 *     name: phone
 *     required: true
 *     schema:
 *       type: string
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
 *             phone:
 *               type: string
 *             code:
 *               type: string
 *             timestamp:
 *               type: number
 *   "400":
 *     description: Bad Request
 *   "404":
 *     description: Not available
 * tags:
 *   - Admin SMS
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  if (!isSandbox()) {
    res.status(404).json({ success: false, message: 'Not available' })
    return
  }

  const phone = (req.query.phone as string)?.replace(/[^0-9+]/g, '')
  if (!phone) {
    res.status(400).json({ success: false, message: 'phone is required' })
    return
  }

  const code = generateCode()
  const timestamp = Date.now()
  store.set(phone, { code, timestamp })

  res.json({ success: true, phone, code, timestamp })
}
