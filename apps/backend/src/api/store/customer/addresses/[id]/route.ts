/**
 * Custom endpoints for managing specific customer address with custom token auth
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { Client } from "pg"

// auth_context is populated by the resolveCustomTokenAuth middleware on /store/*,
// which verifies the signed `cust.<payload>.<sig>` bearer token or the session.
function getCustomerIdFromToken(req: MedusaRequest): string | null {
  return (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ?? null
}

async function customerOwnsAddress(
  req: MedusaRequest,
  customerId: string,
  addressId: string
): Promise<boolean> {
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const addresses = await customerModule.listCustomerAddresses({
    id: addressId,
    customer_id: customerId,
  })
  return addresses.length > 0
}

/**
 * @oas [post] /store/customer/addresses/{id}
 * operationId: "UpdateCustomerAddress"
 * summary: "Update Customer Address"
 * description: "Update an existing address for the authenticated customer"
 * x-authenticated: false
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     schema:
 *       type: string
 *     description: "Address ID"
 *   - in: header
 *     name: Authorization
 *     schema:
 *       type: string
 *     description: "Bearer token"
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 * responses:
 *   "200":
 *     description: OK
 *   "401":
 *     description: Unauthorized
 *   "404":
 *     description: Not Found
 * tags:
 *   - Store - Customer
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const customerId = await getCustomerIdFromToken(req)

    if (!customerId) {
      res.status(401).json({
        message: "Unauthorized",
      })
      return
    }

    const addressId = req.params.id

    if (!(await customerOwnsAddress(req, customerId, addressId))) {
      res.status(404).json({
        message: "Address not found",
      })
      return
    }

    const addressData = req.body as {
      address_name?: string
      first_name?: string
      last_name?: string
      phone?: string
      company?: string
      address_1?: string
      address_2?: string
      city?: string
      city_id?: string
      province?: string
      postal_code?: string
      country_code?: string
      is_default_shipping?: boolean
      is_default_billing?: boolean
      metadata?: Record<string, any>
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    
    const cityId = addressData.city_id || addressData.metadata?.city_id
    
    const addresses = await customerModule.updateCustomerAddresses(addressId, {
      address_name: addressData.address_name,
      first_name: addressData.first_name,
      last_name: addressData.last_name,
      phone: addressData.phone,
      company: addressData.company,
      address_1: addressData.address_1,
      address_2: addressData.address_2,
      city: addressData.city,
      province: addressData.province,
      postal_code: addressData.postal_code,
      country_code: addressData.country_code,
      is_default_shipping: addressData.is_default_shipping,
      is_default_billing: addressData.is_default_billing,
      metadata: {
        ...addressData.metadata,
        city_id: cityId,
      },
    })
    
    const address = Array.isArray(addresses) && addresses.length > 0 ? addresses[0] : addresses
    
    if (cityId) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL?.replace(
          '$DB_NAME',
          process.env.DB_NAME || 'mercur'
        )
      })

      try {
        await client.connect()
        await client.query(
          'UPDATE customer_address SET city_id = $1 WHERE id = $2',
          [cityId, addressId]
        )
        console.log(`✅ city_id updated: ${cityId} for address: ${addressId}`)
      } catch (error) {
        console.error('❌ Error updating city_id:', error)
      } finally {
        await client.end()
      }
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "addresses.*",
      ],
      filters: {
        id: customerId,
      },
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    res.json({
      success: true,
      customer,
      address,
    })
  } catch (error) {
    console.error("Error updating address:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
    })
  }
}

/**
 * @oas [delete] /store/customer/addresses/{id}
 * operationId: "DeleteCustomerAddress"
 * summary: "Delete Customer Address"
 * description: "Delete an address for the authenticated customer"
 * x-authenticated: false
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     schema:
 *       type: string
 *     description: "Address ID"
 *   - in: header
 *     name: Authorization
 *     schema:
 *       type: string
 *     description: "Bearer token"
 * responses:
 *   "200":
 *     description: OK
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - Store - Customer
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const customerId = await getCustomerIdFromToken(req)

    if (!customerId) {
      res.status(401).json({
        message: "Unauthorized",
      })
      return
    }

    const addressId = req.params.id

    if (!(await customerOwnsAddress(req, customerId, addressId))) {
      res.status(404).json({
        message: "Address not found",
      })
      return
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    await customerModule.deleteCustomerAddresses([addressId])

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "addresses.*",
      ],
      filters: {
        id: customerId,
      },
    })

    const customer = customers && customers.length > 0 ? customers[0] : null

    res.json({
      success: true,
      customer,
    })
  } catch (error) {
    console.error("Error deleting address:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
    })
  }
}

