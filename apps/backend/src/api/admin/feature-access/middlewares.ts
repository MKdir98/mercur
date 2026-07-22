import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"

import {
  AdminCreateFeatureGrant,
  AdminGetFeatureGrantsParams,
  AdminGetFeatureModulesParams,
  AdminUpsertFeatureModule,
} from "./validators"

export const featureAccessMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/feature-access/modules",
    middlewares: [validateAndTransformQuery(AdminGetFeatureModulesParams, {})],
  },
  {
    method: ["POST"],
    matcher: "/admin/feature-access/modules",
    middlewares: [validateAndTransformBody(AdminUpsertFeatureModule)],
  },
  {
    method: ["GET"],
    matcher: "/admin/feature-access/grants",
    middlewares: [validateAndTransformQuery(AdminGetFeatureGrantsParams, {})],
  },
  {
    method: ["POST"],
    matcher: "/admin/feature-access/grants",
    middlewares: [validateAndTransformBody(AdminCreateFeatureGrant)],
  },
]
