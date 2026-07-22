import { FEATURE_ACCESS_MODULE } from "../../modules/feature-access"
import type FeatureAccessModuleService from "../../modules/feature-access/service"
import { normalizeIranPhone } from "./normalize-phone"

function isGrantActive(grant: { expires_at: Date | string | null }): boolean {
  if (!grant.expires_at) {
    return true
  }
  return new Date(grant.expires_at) > new Date()
}

/**
 * Named check for a specific module, e.g. from a route that should be hidden
 * entirely until soft-launched. Unconfigured modules (no `feature_module` row)
 * default to open — only modules an admin has explicitly gated are restricted.
 */
export async function hasFeatureAccess(
  container: any,
  moduleName: string,
  phone: string | null | undefined
): Promise<boolean> {
  const service: FeatureAccessModuleService = container.resolve(FEATURE_ACCESS_MODULE)

  const [featureModule] = await service.listFeatureModules({ module_name: moduleName })
  if (!featureModule?.is_gated) {
    return true
  }

  const normalizedPhone = normalizeIranPhone(phone)
  if (!normalizedPhone) {
    return false
  }

  const grants = await service.listFeatureGrants({
    module_name: moduleName,
    phone: normalizedPhone,
  })
  return grants.some(isGrantActive)
}

/**
 * Filters a list of payment providers (or any `{ id: string }` rows) down to
 * the ones the given phone is allowed to see. A provider is only gated if its
 * id contains the name of a `feature_module` row with `is_gated = true`;
 * providers with no matching module row are left untouched.
 */
export async function filterProvidersByFeatureAccess<T extends { id: string }>(
  container: any,
  providers: T[],
  phone: string | null | undefined
): Promise<T[]> {
  if (!providers.length) {
    return providers
  }

  const service: FeatureAccessModuleService = container.resolve(FEATURE_ACCESS_MODULE)
  const gatedModules = await service.listFeatureModules({ is_gated: true })
  if (!gatedModules.length) {
    return providers
  }

  const normalizedPhone = normalizeIranPhone(phone)

  const results: T[] = []
  for (const provider of providers) {
    const idLower = provider.id.toLowerCase()
    const matched = gatedModules.find((m) => idLower.includes(m.module_name.toLowerCase()))

    if (!matched) {
      results.push(provider)
      continue
    }

    if (!normalizedPhone) {
      continue
    }

    const grants = await service.listFeatureGrants({
      module_name: matched.module_name,
      phone: normalizedPhone,
    })
    if (grants.some(isGrantActive)) {
      results.push(provider)
    }
  }

  return results
}
