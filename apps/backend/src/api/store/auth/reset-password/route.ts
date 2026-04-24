import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import bcrypt from "bcrypt"
import { getRegistrationChannel } from "../../../../lib/auth/registration-channel"
import { otpSubjectKey } from "../../../../lib/otp/otp-subject"
import { consumeVerificationToken } from "../../../../lib/otp/verification-token-store"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone, email, newPassword, verificationToken } = req.body as {
    phone?: string
    email?: string
    newPassword?: string
    verificationToken?: string
  }

  const channel = getRegistrationChannel()

  let subjectKey: string
  if (channel === "email") {
    const raw = email?.trim()
    if (!raw) {
      res.status(400).json({
        success: false,
        message: "ایمیل الزامی است",
      })
      return
    }
    subjectKey = otpSubjectKey("email", raw)
  } else {
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "شماره تلفن الزامی است",
      })
      return
    }
    subjectKey = otpSubjectKey("phone", phone)
  }

  if (
    !verificationToken ||
    !consumeVerificationToken(verificationToken, subjectKey)
  ) {
    res.status(403).json({
      success: false,
      message:
        channel === "email"
          ? "تایید ایمیل منقضی شده است. لطفاً دوباره کد تایید دریافت کنید"
          : "تایید شماره تلفن منقضی شده است. لطفاً دوباره کد تایید دریافت کنید",
    })
    return
  }

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
    })
    return
  }

  try {
    const query = req.scope.resolve("query")
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    let customer: {
      id: string
      metadata?: Record<string, unknown> | null
    } | null = null

    if (channel === "email") {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "metadata"],
        filters: { email: subjectKey },
      })
      customer = customers && customers.length > 0 ? customers[0] : null

      if (!customer) {
        res.status(404).json({
          success: false,
          message: "کاربر با این ایمیل یافت نشد",
        })
        return
      }
    } else {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "metadata"],
        filters: { phone: subjectKey },
      })
      customer = customers && customers.length > 0 ? customers[0] : null

      if (!customer) {
        res.status(404).json({
          success: false,
          message: "کاربر با این شماره تلفن یافت نشد",
        })
        return
      }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        password_hash: newPasswordHash,
      },
    })

    res.json({
      success: true,
      message: "رمز عبور با موفقیت تغییر یافت",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      message: "خطای سرور",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
