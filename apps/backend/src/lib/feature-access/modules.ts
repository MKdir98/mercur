/**
 * Fixed list of soft-launch-gated module names. Every module here is hidden
 * from checkout/storefront unless a customer's phone is explicitly granted
 * access via the admin panel. Add new module names here as they're gated.
 */
export const FEATURE_MODULE_NAMES = ["remitation"] as const

export type FeatureModuleName = (typeof FEATURE_MODULE_NAMES)[number]
