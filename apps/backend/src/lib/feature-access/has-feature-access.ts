import { Modules } from "@medusajs/framework/utils"

import { normalizeIranPhone } from "./normalize-phone"
import { FEATURE_MODULE_NAMES, FEATURE_MODULE_PROVIDER_IDS } from "./modules"

export type FeatureAccessMetadata = Record<string, string[]>

/**
 * Granted phones per feature live in the store's `metadata.feature_access`
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
 * Named check for a specific feature. Every name in FEATURE_MODULE_NAMES is
 * gated by definition — a phone only passes if it's in that feature's list.
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
 * Filters a list of payment providers down to what the given phone is
 * allowed to see. Each gated feature explicitly maps to the one provider id
 * it adds (FEATURE_MODULE_PROVIDER_IDS) — providers not tied to any feature
 * are never touched here.
 */
export async function filterProvidersByFeatureAccess<T extends { id: string }>(
  container: any,
  providers: T[],
  phone: string | null | undefined
): Promise<T[]> {
  if (!providers.length) {
    return providers
  }

  const normalizedPhone = normalizeIranPhone(phone)
  const featureAccess = await getFeatureAccessMetadata(container)

  const blockedProviderIds = new Set<string>(
    FEATURE_MODULE_NAMES.filter((name) => {
      const grantedPhones = featureAccess[name] ?? []
      const hasAccess = !!normalizedPhone && grantedPhones.includes(normalizedPhone)
      return !hasAccess
    }).map((name) => FEATURE_MODULE_PROVIDER_IDS[name])
  )

  return providers.filter((provider) => !blockedProviderIds.has(provider.id))
}
