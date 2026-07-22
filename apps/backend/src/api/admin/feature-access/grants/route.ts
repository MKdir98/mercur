import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import { FEATURE_ACCESS_MODULE } from "../../../../modules/feature-access"
import type FeatureAccessModuleService from "../../../../modules/feature-access/service"
import { normalizeIranPhone } from "../../../../lib/feature-access/normalize-phone"
import type { AdminCreateFeatureGrantType } from "../validators"

/**
 * @oas [get] /admin/feature-access/grants
 * operationId: "AdminListFeatureGrants"
 * summary: "List feature-access grants"
 * description: "Retrieves the phone numbers granted early access to a soft-launched module."
 * x-authenticated: true
 * parameters:
 *   - name: module_name
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin Feature Access
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: FeatureAccessModuleService = req.scope.resolve(FEATURE_ACCESS_MODULE)
  const query = req.validatedQuery as {
    module_name?: string
    offset?: number
    limit?: number
  }

  const [feature_grants, count] = await service.listAndCountFeatureGrants(
    query.module_name ? { module_name: query.module_name } : {},
    {
      skip: query.offset || 0,
      take: query.limit || 50,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    feature_grants,
    count,
    offset: query.offset || 0,
    limit: query.limit || 50,
  })
}

/**
 * @oas [post] /admin/feature-access/grants
 * operationId: "AdminCreateFeatureGrant"
 * summary: "Grant a phone number access to a module"
 * description: "Adds a phone number to a module's soft-launch allowlist. Normalizes the phone to a bare 98XXXXXXXXXX form before storing."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminCreateFeatureGrant"
 * responses:
 *   "201":
 *     description: Created
 * tags:
 *   - Admin Feature Access
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminCreateFeatureGrantType>,
  res: MedusaResponse
) => {
  const service: FeatureAccessModuleService = req.scope.resolve(FEATURE_ACCESS_MODULE)
  const { module_name, phone, expires_at } = req.validatedBody

  const normalizedPhone = normalizeIranPhone(phone)
  if (!normalizedPhone) {
    res.status(400).json({ message: "Invalid phone number" })
    return
  }

  const grantedBy = (req as any).auth_context?.actor_id as string | undefined

  const [feature_grant] = await service.createFeatureGrants([
    {
      module_name,
      phone: normalizedPhone,
      granted_by: grantedBy ?? null,
      expires_at: expires_at ? new Date(expires_at) : null,
    },
  ])

  res.status(201).json({ feature_grant })
}
