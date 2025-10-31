/**
 * لاگین با شماره تلفن
 * Phone-based authentication
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import bcrypt from "bcrypt"

/**
 * @oas [post] /store/auth/phone
 * operationId: "PhoneAuth"
 * summary: "Authenticate with phone"
 * description: "Authenticate user using phone number after OTP verification"
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
 *           firstName:
 *             type: string
 *             description: "Required for new users"
 *           lastName:
 *             type: string
 *             description: "Required for new users"
 *           isNewUser:
 *             type: boolean
 *             description: "Whether this is a new user registration"
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
 *             token:
 *               type: string
 *             customer:
 *               type: object
 *   "400":
 *     description: Bad Request
 *   "404":
 *     description: Customer not found
 *   "500":
 *     description: Internal Server Error
 * tags:
 *   - Store - Auth
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const {
    phone,
    firstName,
    lastName,
    isNewUser,
    password,
  } = req.body as {
    phone?: string
    firstName?: string
    lastName?: string
    isNewUser?: boolean
    password?: string
  }

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')

  try {
    const query = req.scope.resolve("query")
    const authModule = req.scope.resolve(Modules.AUTH)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    if (isNewUser) {
      // ثبت نام کاربر جدید
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

      // تولید ایمیل موقت (چون Medusa به email نیاز دارد)
      const tempEmail = `${normalizedPhone.replace(/\+/g, "")}@phone.temp`

      // Hash کردن password
      const passwordHash = await bcrypt.hash(password, 10)

      try {
        // ایجاد customer با phone
        // توجه: createCustomers یک array می‌گیره
        const customers = await customerModule.createCustomers([{
          email: tempEmail,
          phone: normalizedPhone,
          first_name: firstName,
          last_name: lastName,
          has_account: true,
          metadata: {
            password_hash: passwordHash,
          },
        }])

        // چک کردن که customer ساخته شده
        if (!customers || customers.length === 0) {
          res.status(500).json({
            success: false,
            message: "خطا در ایجاد حساب کاربری",
          })
          return
        }

        const customer = customers[0]

        // ذخیره customer در session
        if (req.session) {
          req.session.auth_context = {
            actor_id: customer.id,
            actor_type: "customer",
          }
          req.session.customer_id = customer.id
        }

        // تولید token
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
      } catch (createError: any) {
        // اگه customer قبلاً وجود داره، خطا بده
        if (createError.message && createError.message.includes('already exists')) {
          res.status(400).json({
            success: false,
            message: "این شماره تلفن قبلاً ثبت نام کرده است. لطفاً از صفحه ورود استفاده کنید",
          })
          return
        }
        
        // اگه خطای دیگه‌ای بود
        throw createError
      }
    } else {
      // اگه isNewUser false باشه، یعنی باید از endpoint login استفاده کنه
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

