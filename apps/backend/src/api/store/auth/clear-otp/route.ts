import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRegistrationChannel } from "../../../../lib/auth/registration-channel"
import { otpSubjectKey } from "../../../../lib/otp/otp-subject"
import { deleteOTP } from "../../../../lib/otp/otp-store"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const isLocal =
    process.env.APP_ENV === "local" || process.env.APP_ENV === "demo"

  if (!isLocal) {
    res.status(404).json({
      success: false,
      message: "Not available in production",
    })
    return
  }

  const { phone, email } = req.body as { phone?: string; email?: string }
  const channel = getRegistrationChannel()

  if (channel === "email") {
    if (!email?.trim()) {
      res.status(400).json({
        success: false,
        message: "ایمیل الزامی است",
      })
      return
    }
    deleteOTP(otpSubjectKey("email", email))
  } else {
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "شماره تلفن الزامی است",
      })
      return
    }
    deleteOTP(otpSubjectKey("phone", phone))
  }

  res.json({
    success: true,
    message: "OTP پاک شد - می‌تونی دوباره درخواست بدی",
  })
}
