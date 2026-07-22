import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import { FEATURE_ACCESS_MODULE } from "../../../../modules/feature-access"
import type FeatureAccessModuleService from "../../../../modules/feature-access/service"
import type { AdminUpsertFeatureModuleType } from "../validators"

/**
 * @oas [get] /admin/feature-access/modules
 * operationId: "AdminListFeatureModules"
 * summary: "List soft-launch feature modules"
 * description: "Retrieves every module registered with the feature-access gate, and whether it is currently gated."
 * x-authenticated: true
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

  const feature_modules = await service.listFeatureModules(
    {},
    { order: { module_name: "ASC" } }
  )

  res.json({ feature_modules })
}

/**
 * @oas [post] /admin/feature-access/modules
 * operationId: "AdminUpsertFeatureModule"
 * summary: "Create or update a feature module gate"
 * description: "Registers a module for soft-launch gating, or flips its is_gated switch. When is_gated is false the module is visible to everyone regardless of grants."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminUpsertFeatureModule"
 * responses:
 *   "200":
 *     description: OK
 *   "201":
 *     description: Created
 * tags:
 *   - Admin Feature Access
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: MedusaRequest<AdminUpsertFeatureModuleType>,
  res: MedusaResponse
) => {
  const service: FeatureAccessModuleService = req.scope.resolve(FEATURE_ACCESS_MODULE)
  const { module_name, is_gated } = req.validatedBody

  const [existing] = await service.listFeatureModules({ module_name })

  if (existing) {
    const feature_module = await service.updateFeatureModules({
      id: existing.id,
      is_gated,
    })
    res.status(200).json({ feature_module })
    return
  }

  const [feature_module] = await service.createFeatureModules([
    { module_name, is_gated },
  ])
  res.status(201).json({ feature_module })
}
