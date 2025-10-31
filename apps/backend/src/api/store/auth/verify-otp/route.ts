/**
 * تایید کد OTP
 * Verify OTP code
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getOTP,
  deleteOTP,
  incrementAttempts,
  isOTPExpired,
} from "../../../../lib/otp/otp-store"

const MAX_ATTEMPTS = 5

/**
 * @oas [post] /store/auth/verify-otp
 * operationId: "VerifyOTP"
 * summary: "Verify OTP code"
 * description: "Verifies the OTP code sent to the phone number"
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - phone
 *           - code
 *         properties:
 *           phone:
 *             type: string
 *           code:
 *             type: string
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
 *   "400":
 *     description: Bad Request
 *   "404":
 *     description: Not Found
 *   "429":
 *     description: Too Many Attempts
 * tags:
 *   - Store - Auth
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone, code } = req.body as { phone?: string; code?: string }

  if (!phone || !code) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن و کد تایید الزامی است",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')
  const storedData = getOTP(normalizedPhone)

  if (!storedData) {
    res.status(404).json({
      success: false,
      message: "کد تایید یافت نشد. لطفاً دوباره درخواست دهید",
    })
    return
  }

  // بررسی انقضا
  if (isOTPExpired(normalizedPhone)) {
    deleteOTP(normalizedPhone)
    res.status(400).json({
      success: false,
      message: "کد تایید منقضی شده است. لطفاً دوباره درخواست دهید",
    })
    return
  }

  // بررسی تعداد تلاش‌ها
  if (storedData.attempts >= MAX_ATTEMPTS) {
    deleteOTP(normalizedPhone)
    res.status(429).json({
      success: false,
      message: "تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً دوباره درخواست کد دهید",
    })
    return
  }

  // بررسی صحت کد
  if (storedData.code !== code) {
    const attempts = incrementAttempts(normalizedPhone)
    const remainingAttempts = MAX_ATTEMPTS - attempts

    res.status(400).json({
      success: false,
      message: `کد تایید نادرست است. ${remainingAttempts} تلاش باقی مانده`,
    })
    return
  }

  // موفق - حذف OTP از store
  deleteOTP(normalizedPhone)

  res.json({
    success: true,
    message: "کد تایید با موفقیت تأیید شد",
  })
}

