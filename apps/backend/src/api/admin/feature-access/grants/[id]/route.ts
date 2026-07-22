import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import { FEATURE_ACCESS_MODULE } from "../../../../../modules/feature-access"
import type FeatureAccessModuleService from "../../../../../modules/feature-access/service"

/**
 * @oas [delete] /admin/feature-access/grants/{id}
 * operationId: "AdminDeleteFeatureGrant"
 * summary: "Revoke a feature-access grant"
 * description: "Removes a phone number's early access to a soft-launched module."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin Feature Access
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: FeatureAccessModuleService = req.scope.resolve(FEATURE_ACCESS_MODULE)
  await service.deleteFeatureGrants([req.params.id])
  res.status(200).json({ id: req.params.id, object: "feature_grant", deleted: true })
}
