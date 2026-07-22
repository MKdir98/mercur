import { Modules } from "@medusajs/framework/utils"

import { normalizeIranPhone } from "./normalize-phone"
import { FEATURE_MODULE_NAMES } from "./modules"

export type FeatureAccessMetadata = Record<string, string[]>

/**
 * Granted phones per module live in the store's `metadata.feature_access`
 * blob — no dedicated table. Mirrors how `price_display_usd` is stored on
 * the same store row (see /store/price-display-config).
 */
export async function getFeatureAccessMetadata(
  container: any
): Promise<FeatureAccessMetadata> {
  const storeModule = container.resolve(Modules.STORE)
  const [store] = await storeModule.listStores()
  const meta = (store?.metadata ?? {}) as Record<string, unknown>
  return (meta.feature_access as FeatureAccessMetadata | undefined) ?? {}
}

/**
 * Named check for a specific module. Every name in FEATURE_MODULE_NAMES is
 * gated by definition — a phone only passes if it's in that module's list.
 */
export async function hasFeatureAccess(
  container: any,
  moduleName: string,
  phone: string | null | undefined
): Promise<boolean> {
  if (!(FEATURE_MODULE_NAMES as readonly string[]).includes(moduleName)) {
    return true
  }

  const normalizedPhone = normalizeIranPhone(phone)
  if (!normalizedPhone) {
    return false
  }

  const featureAccess = await getFeatureAccessMetadata(container)
  return (featureAccess[moduleName] ?? []).includes(normalizedPhone)
}

/**
 * Filters a list of payment providers (or any `{ id: string }` rows) down to
 * the ones the given phone is allowed to see. A provider is only gated if its
 * id contains one of FEATURE_MODULE_NAMES; anything else is left untouched.
 */
export async function filterProvidersByFeatureAccess<T extends { id: string }>(
  container: any,
  providers: T[],
  phone: string | null | undefined
): Promise<T[]> {
  if (!providers.length) {
    return providers
  }

  const gatedNames = FEATURE_MODULE_NAMES.filter((name) =>
    providers.some((p) => p.id.toLowerCase().includes(name))
  )
  if (!gatedNames.length) {
    return providers
  }

  const normalizedPhone = normalizeIranPhone(phone)
  const featureAccess = await getFeatureAccessMetadata(container)

  return providers.filter((provider) => {
    const idLower = provider.id.toLowerCase()
    const matched = gatedNames.find((name) => idLower.includes(name))

    if (!matched) {
      return true
    }
    if (!normalizedPhone) {
      return false
    }
    return (featureAccess[matched] ?? []).includes(normalizedPhone)
  })
}
