import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import bcrypt from "bcrypt"
import { getRegistrationChannel } from "../../../../lib/auth/registration-channel"
import { otpSubjectKey } from "../../../../lib/otp/otp-subject"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone, email, password } = req.body as {
    phone?: string
    email?: string
    password?: string
  }

  const channel = getRegistrationChannel()

  if (!password) {
    res.status(400).json({
      success: false,
      message: "رمز عبور الزامی است",
    })
    return
  }

  try {
    const query = req.scope.resolve("query")

    let customer: {
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      phone: string | null
      metadata?: Record<string, unknown> | null
    } | null = null

    if (channel === "email") {
      const raw = email?.trim()
      if (!raw) {
        res.status(400).json({
          success: false,
          message: "ایمیل الزامی است",
        })
        return
      }
      const normalizedEmail = otpSubjectKey("email", raw)

      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name", "phone", "metadata"],
        filters: {
          email: normalizedEmail,
        },
      })

      customer = customers && customers.length > 0 ? customers[0] : null
    } else {
      if (!phone) {
        res.status(400).json({
          success: false,
          message: "شماره تلفن الزامی است",
        })
        return
      }

      const normalizedPhone = phone.replace(/[^0-9+]/g, "")

      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name", "phone", "metadata"],
        filters: {
          phone: normalizedPhone,
        },
      })

      customer = customers && customers.length > 0 ? customers[0] : null
    }

    if (!customer) {
      res.status(401).json({
        success: false,
        message:
          channel === "email"
            ? "ایمیل یا رمز عبور اشتباه است"
            : "شماره تلفن یا رمز عبور اشتباه است",
      })
      return
    }

    const passwordHash = customer.metadata?.password_hash

    if (!passwordHash) {
      res.status(401).json({
        success: false,
        message:
          "حساب کاربری شما رمز عبور ندارد. لطفاً از بازیابی رمز عبور استفاده کنید",
      })
      return
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      String(passwordHash)
    )

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message:
          channel === "email"
            ? "ایمیل یا رمز عبور اشتباه است"
            : "شماره تلفن یا رمز عبور اشتباه است",
      })
      return
    }

    if (req.session) {
      req.session.auth_context = {
        actor_id: customer.id,
        actor_type: "customer",
      }
      req.session.customer_id = customer.id
    }

    const token = `cust_${customer.id}_${Date.now()}`

    res.json({
      success: true,
      message: "ورود موفقیت‌آمیز",
      token: token,
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        email: customer.email,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "خطای سرور",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
