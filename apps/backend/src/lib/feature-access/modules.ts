/**
 * Fixed list of soft-launch-gated features and, explicitly, what each one
 * controls. A feature is hidden from checkout/storefront unless a customer's
 * phone is granted access via the admin panel. Add new features here as
 * they're gated — each one maps to the exact payment_provider.id it adds.
 */
export const FEATURE_MODULE_PROVIDER_IDS = {
  remitation: "pp_remitation-gateway_remitation",
} as const

export const FEATURE_MODULE_NAMES = Object.keys(
  FEATURE_MODULE_PROVIDER_IDS
) as (keyof typeof FEATURE_MODULE_PROVIDER_IDS)[]

export type FeatureModuleName = (typeof FEATURE_MODULE_NAMES)[number]
