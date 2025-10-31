/**
 * بازیابی رمز عبور
 * Reset password after OTP verification
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import bcrypt from "bcrypt"

/**
 * @oas [post] /store/auth/reset-password
 * operationId: "ResetPassword"
 * summary: "Reset password"
 * description: "Reset user password after OTP verification"
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - phone
 *           - newPassword
 *         properties:
 *           phone:
 *             type: string
 *           newPassword:
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
    newPassword,
  } = req.body as {
    phone?: string
    newPassword?: string
  }

  if (!phone) {
    res.status(400).json({
      success: false,
      message: "شماره تلفن الزامی است",
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

  const normalizedPhone = phone.replace(/[^0-9+]/g, '')

  try {
    const query = req.scope.resolve("query")
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // پیدا کردن customer با phone
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "metadata"],
      filters: {
        phone: normalizedPhone,
      },
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "کاربر با این شماره تلفن یافت نشد",
      })
      return
    }

    // Hash کردن password جدید
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // آپدیت کردن customer با password جدید
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

