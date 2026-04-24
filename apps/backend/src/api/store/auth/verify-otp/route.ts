import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRegistrationChannel } from "../../../../lib/auth/registration-channel"
import { isValidEmailAddress } from "../../../../lib/email/otp-mail.service"
import { otpSubjectKey } from "../../../../lib/otp/otp-subject"
import {
  getOTP,
  deleteOTP,
  incrementAttempts,
  isOTPExpired,
} from "../../../../lib/otp/otp-store"
import { createVerificationToken } from "../../../../lib/otp/verification-token-store"

const MAX_ATTEMPTS = 5

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone, email, code } = req.body as {
    phone?: string
    email?: string
    code?: string
  }

  const channel = getRegistrationChannel()

  let subjectKey: string
  if (channel === "email") {
    const raw = email?.trim()
    if (!raw || !code) {
      res.status(400).json({
        success: false,
        message: "ایمیل و کد تایید الزامی است",
      })
      return
    }
    if (!isValidEmailAddress(raw)) {
      res.status(400).json({
        success: false,
        message: "فرمت ایمیل صحیح نیست",
      })
      return
    }
    subjectKey = otpSubjectKey("email", raw)
  } else {
    if (!phone || !code) {
      res.status(400).json({
        success: false,
        message: "شماره تلفن و کد تایید الزامی است",
      })
      return
    }
    subjectKey = otpSubjectKey("phone", phone)
  }

  const storedData = getOTP(subjectKey)

  if (!storedData) {
    res.status(404).json({
      success: false,
      message: "کد تایید یافت نشد. لطفاً دوباره درخواست دهید",
    })
    return
  }

  if (isOTPExpired(subjectKey)) {
    deleteOTP(subjectKey)
    res.status(400).json({
      success: false,
      message: "کد تایید منقضی شده است. لطفاً دوباره درخواست دهید",
    })
    return
  }

  if (storedData.attempts >= MAX_ATTEMPTS) {
    deleteOTP(subjectKey)
    res.status(429).json({
      success: false,
      message:
        "تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً دوباره کد تایید دهید",
    })
    return
  }

  if (storedData.code !== code) {
    const attempts = incrementAttempts(subjectKey)
    const remainingAttempts = MAX_ATTEMPTS - attempts

    res.status(400).json({
      success: false,
      message: `کد تایید نادرست است. ${remainingAttempts} تلاش باقی مانده`,
    })
    return
  }

  deleteOTP(subjectKey)
  const verificationToken = createVerificationToken(subjectKey)

  res.json({
    success: true,
    message: "کد تایید با موفقیت تأیید شد",
    verificationToken,
  })
}
