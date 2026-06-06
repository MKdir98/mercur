/**
 * Get current customer by custom token
 * این endpoint customer را بر اساس token سفارشی ما برمی‌گرداند
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { verifyCustomerToken } from '../../../../lib/auth/customer-token'

/**
 * @oas [get] /store/auth/customer-info
 * operationId: "GetCustomerInfo"
 * summary: "Get Current Customer Info"
 * description: "Retrieve the logged in customer's details using custom token"
 * x-authenticated: false
 * parameters:
 *   - in: header
 *     name: Authorization
 *     schema:
 *       type: string
 *     description: "Bearer token"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             customer:
 *               type: object
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - Store - Auth
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    // دریافت token از header
    const authHeader = req.headers.authorization

    if (!authHeader) {
      res.status(401).json({
        message: 'No authorization token provided'
      })
      return
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader
    const customerId = verifyCustomerToken(token)

    if (!customerId) {
      res.status(401).json({
        message: 'Invalid token format'
      })
      return
    }

    // دریافت customer از database
    const query = req.scope.resolve('query')

    const { data: customers } = await query.graph({
      entity: 'customer',
      fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'phone',
        'has_account',
        'metadata',
        'created_at',
        'updated_at',
        'addresses.*'
      ],
      filters: {
        id: customerId
      }
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    if (!customer) {
      res.status(404).json({
        message: 'Customer not found'
      })
      return
    }

    // برگرداندن اطلاعات customer
    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        has_account: customer.has_account,
        metadata: customer.metadata,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        addresses: customer.addresses || []
      }
    })
  } catch (error) {
    console.error('Get customer info error:', error)
    res.status(500).json({
      message: 'خطای سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
