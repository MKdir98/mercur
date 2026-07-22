import { model } from "@medusajs/framework/utils"

export const FeatureGrant = model.define("feature_grant", {
  id: model.id({ prefix: "featgrant" }).primaryKey(),
  module_name: model.text(),
  phone: model.text(),
  granted_by: model.text().nullable(),
  expires_at: model.dateTime().nullable(),
})
