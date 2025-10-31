/**
 * ورود با شماره تلفن و رمز عبور
 * Login with phone + password (no OTP)
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import bcrypt from "bcrypt"

/**
 * @oas [post] /store/auth/login
 * operationId: "Login"
 * summary: "Login with phone and password"
 * description: "Authenticate user using phone number and password"
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - phone
 *           - password
 *         properties:
 *           phone:
 *             type: string
 *           password:
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
 *             token:
 *               type: string
 *             customer:
 *               type: object
 *   "400":
 *     description: Bad Request
 *   "401":
 *     description: Unauthorized
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
    password,
  } = req.body as {
    phone?: string
    password?: string
  }

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
    })
    return
  }

  if (!password) {
    res.status(400).json({
      success: false,
      message: "رمز عبور الزامی است",
    })
    return
  }

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')

  try {
    const query = req.scope.resolve("query")

    // پیدا کردن customer با phone و metadata
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "phone", "metadata"],
      filters: {
        phone: normalizedPhone,
      },
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    if (!customer) {
      res.status(401).json({
        success: false,
        message: "شماره تلفن یا رمز عبور اشتباه است",
      })
      return
    }

    // چک کردن password
    const passwordHash = customer.metadata?.password_hash

    if (!passwordHash) {
      res.status(401).json({
        success: false,
        message: "حساب کاربری شما رمز عبور ندارد. لطفاً از بازیابی رمز عبور استفاده کنید",
      })
      return
    }

    // مقایسه password با hash
    const isPasswordValid = await bcrypt.compare(password, passwordHash)

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "شماره تلفن یا رمز عبور اشتباه است",
      })
      return
    }

    // ذخیره customer در session/auth context
    // به جای تولید token دستی، از session Medusa استفاده می‌کنیم
    
    // Set auth context برای Medusa
    if (req.session) {
      req.session.auth_context = {
        actor_id: customer.id,
        actor_type: "customer",
      }
      req.session.customer_id = customer.id
    }

    // تولید یک token ساده برای frontend
    // این token فقط برای شناسایی customer استفاده می‌شود
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

