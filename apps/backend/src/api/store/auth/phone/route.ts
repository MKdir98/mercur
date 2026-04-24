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
  const {
    phone,
    firstName,
    lastName,
    email,
    dateOfBirth,
    isNewUser,
    password,
    verificationToken,
  } = req.body as {
    phone?: string
    firstName?: string
    lastName?: string
    email?: string
    dateOfBirth?: string
    isNewUser?: boolean
    password?: string
    verificationToken?: string
  }

  const channel = getRegistrationChannel()

  try {
    const query = req.scope.resolve("query")
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    if (isNewUser) {
      if (channel === "email") {
        const verifiedEmail = email?.trim().toLowerCase()
        if (!verifiedEmail) {
          res.status(400).json({
            success: false,
            message: "ایمیل الزامی است",
          })
          return
        }

        const subjectKey = otpSubjectKey("email", verifiedEmail)

        if (
          !verificationToken ||
          !consumeVerificationToken(verificationToken, subjectKey)
        ) {
          res.status(403).json({
            success: false,
            message:
              "تایید ایمیل منقضی شده است. لطفاً دوباره کد تایید دریافت کنید",
          })
          return
        }

        if (!firstName || !lastName) {
          res.status(400).json({
            success: false,
            message: "نام و نام خانوادگی الزامی است",
          })
          return
        }

        if (!password || password.length < 8) {
          res.status(400).json({
            success: false,
            message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
          })
          return
        }

        const { data: existingByEmail } = await query.graph({
          entity: "customer",
          fields: ["id"],
          filters: { email: verifiedEmail },
        })
        if (existingByEmail && existingByEmail.length > 0) {
          res.status(400).json({
            success: false,
            message: "این ایمیل قبلاً ثبت شده است",
          })
          return
        }

        let customerPhone: string | null = null
        if (phone?.trim()) {
          customerPhone = phone.replace(/[^0-9+]/g, "")
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const metadata: Record<string, unknown> = {
          password_hash: passwordHash,
        }
        if (dateOfBirth && dateOfBirth.trim()) {
          metadata.date_of_birth = dateOfBirth.trim()
        }

        try {
          const customers = await customerModule.createCustomers([
            {
              email: verifiedEmail,
              phone: customerPhone,
              first_name: firstName,
              last_name: lastName,
              has_account: true,
              metadata,
            },
          ])

          if (!customers || customers.length === 0) {
            res.status(500).json({
              success: false,
              message: "خطا در ایجاد حساب کاربری",
            })
            return
          }

          const customer = customers[0]

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
            message: "حساب کاربری با موفقیت ایجاد شد",
            token: token,
            customer: {
              id: customer.id,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: customer.phone,
              email: customer.email,
            },
          })
        } catch (createError: unknown) {
          const errMsg =
            createError instanceof Error
              ? createError.message.toLowerCase()
              : ""
          if (
            errMsg.includes("already exists") ||
            errMsg.includes("duplicate")
          ) {
            const isEmailError =
              errMsg.includes("email") || errMsg.includes("ایمیل")
            res.status(400).json({
              success: false,
              message: isEmailError
                ? "این ایمیل قبلاً ثبت شده است"
                : "این شماره تلفن قبلاً ثبت نام کرده است. لطفاً از صفحه ورود استفاده کنید",
            })
            return
          }
          throw createError
        }
        return
      }

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "شماره تلفن الزامی است",
        })
        return
      }

      const normalizedPhone = phone.replace(/[^0-9+]/g, "")

      if (
        !verificationToken ||
        !consumeVerificationToken(verificationToken, normalizedPhone)
      ) {
        res.status(403).json({
          success: false,
          message:
            "تایید شماره تلفن منقضی شده است. لطفاً دوباره کد تایید دریافت کنید",
        })
        return
      }

      if (!firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: "نام و نام خانوادگی الزامی است",
        })
        return
      }

      if (!password || password.length < 8) {
        res.status(400).json({
          success: false,
          message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
        })
        return
      }

      const customerEmail =
        email && email.trim() && !email.endsWith("@phone.temp")
          ? email.trim()
          : `${normalizedPhone.replace(/\+/g, "")}@phone.temp`

      if (email && email.trim() && !email.endsWith("@phone.temp")) {
        const { data: existingByEmail } = await query.graph({
          entity: "customer",
          fields: ["id"],
          filters: { email: customerEmail },
        })
        if (existingByEmail && existingByEmail.length > 0) {
          res.status(400).json({
            success: false,
            message: "این ایمیل قبلاً ثبت شده است",
          })
          return
        }
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const metadata: Record<string, unknown> = {
        password_hash: passwordHash,
      }
      if (dateOfBirth && dateOfBirth.trim()) {
        metadata.date_of_birth = dateOfBirth.trim()
      }

      try {
        const customers = await customerModule.createCustomers([
          {
            email: customerEmail,
            phone: normalizedPhone,
            first_name: firstName,
            last_name: lastName,
            has_account: true,
            metadata,
          },
        ])

        if (!customers || customers.length === 0) {
          res.status(500).json({
            success: false,
            message: "خطا در ایجاد حساب کاربری",
          })
          return
        }

        const customer = customers[0]

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
          message: "حساب کاربری با موفقیت ایجاد شد",
          token: token,
          customer: {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
          },
        })
      } catch (createError: unknown) {
        const errMsg =
          createError instanceof Error
            ? createError.message.toLowerCase()
            : ""
        if (
          errMsg.includes("already exists") ||
          errMsg.includes("duplicate")
        ) {
          const isEmailError =
            errMsg.includes("email") || errMsg.includes("ایمیل")
          res.status(400).json({
            success: false,
            message: isEmailError
              ? "این ایمیل قبلاً ثبت شده است"
              : "این شماره تلفن قبلاً ثبت نام کرده است. لطفاً از صفحه ورود استفاده کنید",
          })
          return
        }
        throw createError
      }
    } else {
      res.status(400).json({
        success: false,
        message: "برای ورود از endpoint /store/auth/login استفاده کنید",
      })
    }
  } catch (error) {
    console.error("Phone auth error:", error)
    res.status(500).json({
      success: false,
      message: "خطای سرور",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
