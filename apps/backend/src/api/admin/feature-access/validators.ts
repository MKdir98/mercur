import { z } from "zod"

export const AdminGetFeatureModulesParams = z
  .object({})
  .passthrough()
export type AdminGetFeatureModulesParamsType = z.infer<typeof AdminGetFeatureModulesParams>

export const AdminUpsertFeatureModule = z
  .object({
    module_name: z.string().min(1),
    is_gated: z.boolean(),
  })
  .strict()
export type AdminUpsertFeatureModuleType = z.infer<typeof AdminUpsertFeatureModule>

export const AdminGetFeatureGrantsParams = z
  .object({
    module_name: z.string().optional(),
    offset: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .passthrough()
export type AdminGetFeatureGrantsParamsType = z.infer<typeof AdminGetFeatureGrantsParams>

export const AdminCreateFeatureGrant = z
  .object({
    module_name: z.string().min(1),
    phone: z.string().min(5),
    expires_at: z.string().datetime().optional(),
  })
  .strict()
export type AdminCreateFeatureGrantType = z.infer<typeof AdminCreateFeatureGrant>
