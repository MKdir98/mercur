import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRegistrationChannel } from "../../../../lib/auth/registration-channel"
import { sendOtpEmail } from "../../../../lib/email/otp-mail.service"
import { otpSubjectKey } from "../../../../lib/otp/otp-subject"
import { storeOTP, getOTP } from "../../../../lib/otp/otp-store"
import { createSmsService, generateOTP } from "../../../../lib/sms/sms-ir.service"

const MAX_OTP_REQUESTS_PER_HOUR = 3

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const channel = getRegistrationChannel()
  const body = req.body as { phone?: string; email?: string }

  if (channel === "email") {
    const emailRaw = body.email?.trim()
    if (!emailRaw) {
      res.status(400).json({
        success: false,
        message: "ایمیل الزامی است",
      })
      return
    }

    const subjectKey = otpSubjectKey("email", emailRaw)

    const isLocal =
      process.env.APP_ENV === "local" || process.env.APP_ENV === "demo"
    const rateLimitSeconds = isLocal ? 30 : 120

    const existingOTP = getOTP(subjectKey)
    if (existingOTP) {
      const timeSinceLastRequest = Date.now() - existingOTP.createdAt

      if (timeSinceLastRequest < rateLimitSeconds * 1000) {
        const remainingSeconds = Math.ceil(
          (rateLimitSeconds * 1000 - timeSinceLastRequest) / 1000
        )
        res.status(429).json({
          success: false,
          message: `لطفاً ${remainingSeconds} ثانیه صبر کنید قبل از درخواست کد جدید`,
        })
        return
      }
    }

    try {
      const code = generateOTP()
      const mailResult = await sendOtpEmail(emailRaw, code)

      if (!mailResult.success) {
        res.status(500).json({
          success: false,
          message: mailResult.error || "خطا در ارسال ایمیل",
        })
        return
      }

      storeOTP(subjectKey, code, 5)

      res.json({
        success: true,
        message: "کد تایید به ایمیل شما ارسال شد",
      })
    } catch (error) {
      console.error("Send OTP email error:", error)
      res.status(500).json({
        success: false,
        message: "خطای سرور",
      })
    }
    return
  }

  const { phone } = body

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
    })
    return
  }

  const normalizedPhone = otpSubjectKey("phone", phone)

  const iranPhoneRegex = /^(\+98|0)?9\d{9}$/
  if (!iranPhoneRegex.test(normalizedPhone)) {
    res.status(400).json({
      success: false,
      message: "فرمت شماره تلفن صحیح نیست",
    })
    return
  }

  const isLocal =
    process.env.APP_ENV === "local" || process.env.APP_ENV === "demo"
  const rateLimitSeconds = isLocal ? 30 : 120

  const existingOTP = getOTP(normalizedPhone)
  if (existingOTP) {
    const timeSinceLastRequest = Date.now() - existingOTP.createdAt

    if (timeSinceLastRequest < rateLimitSeconds * 1000) {
      const remainingSeconds = Math.ceil(
        (rateLimitSeconds * 1000 - timeSinceLastRequest) / 1000
      )
      res.status(429).json({
        success: false,
        message: `لطفاً ${remainingSeconds} ثانیه صبر کنید قبل از درخواست کد جدید`,
      })
      return
    }
  }

  try {
    const code = generateOTP()

    const smsService = createSmsService()
    const result = await smsService.sendOTP(normalizedPhone, code)

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || "خطا در ارسال پیامک",
      })
      return
    }

    storeOTP(normalizedPhone, code, 5)

    res.json({
      success: true,
      message: "کد تایید با موفقیت ارسال شد",
      messageId: result.messageId,
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
