/**
 * ارسال کد OTP به شماره تلفن
 * Send OTP code to phone number
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createSmsService, generateOTP } from "../../../../lib/sms/sms-ir.service"
import { storeOTP, getOTP } from "../../../../lib/otp/otp-store"

const MAX_OTP_REQUESTS_PER_HOUR = 3

/**
 * @oas [post] /store/auth/send-otp
 * operationId: "SendOTP"
 * summary: "Send OTP to phone"
 * description: "Sends a 6-digit OTP code to the provided phone number via SMS"
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
 *             description: "Phone number to send OTP to"
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
 *             message:
 *               type: string
 *             messageId:
 *               type: string
 *             code:
 *               type: string
 *               description: "Only in sandbox mode for testing"
 *   "400":
 *     description: Bad Request
 *   "429":
 *     description: Too Many Requests
 *   "500":
 *     description: Internal Server Error
 * tags:
 *   - Store - Auth
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone } = req.body as { phone?: string }

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')

  // اعتبارسنجی فرمت شماره ایرانی
  const iranPhoneRegex = /^(\+98|0)?9\d{9}$/
  if (!iranPhoneRegex.test(normalizedPhone)) {
    res.status(400).json({
      success: false,
      message: "فرمت شماره تلفن صحیح نیست",
    })
    return
  }

  // بررسی rate limiting
  // در محیط local/demo، rate limiting رو کم می‌کنیم برای تست راحت‌تر
  const isLocal = process.env.APP_ENV === 'local' || process.env.APP_ENV === 'demo'
  const rateLimitSeconds = isLocal ? 30 : 120 // 30 ثانیه در local، 2 دقیقه در production
  
  const existingOTP = getOTP(normalizedPhone)
  if (existingOTP) {
    const timeSinceLastRequest = Date.now() - existingOTP.createdAt

    // بررسی rate limiting
    if (timeSinceLastRequest < rateLimitSeconds * 1000) {
      const remainingSeconds = Math.ceil((rateLimitSeconds * 1000 - timeSinceLastRequest) / 1000)
      res.status(429).json({
        success: false,
        message: `لطفاً ${remainingSeconds} ثانیه صبر کنید قبل از درخواست کد جدید`,
      })
      return
    }
  }

  try {
    // تولید کد OTP
    const code = generateOTP()

    // ارسال SMS
    const smsService = createSmsService()
    const result = await smsService.sendOTP(normalizedPhone, code)

    if (!result.success) {
      // اگر ارسال SMS ناموفق بود، rate limit اعمال نمیشه
      res.status(500).json({
        success: false,
        message: result.error || "خطا در ارسال پیامک",
      })
      return
    }

    // فقط اگر SMS موفق بود، کد رو در store ذخیره می‌کنیم
    // این باعث میشه rate limiting فقط برای ارسال‌های موفق اعمال بشه
    storeOTP(normalizedPhone, code, 5) // 5 دقیقه اعتبار

    res.json({
      success: true,
      message: "کد تایید با موفقیت ارسال شد",
      messageId: result.messageId,
      // فقط در sandbox mode کد رو برمی‌گردونیم
      ...(result.code && { code: result.code }),
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    res.status(500).json({
      success: false,
      message: "خطای سرور",
    })
  }
}

