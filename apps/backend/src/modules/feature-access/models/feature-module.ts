import { model } from "@medusajs/framework/utils"

export const FeatureModule = model.define("feature_module", {
  id: model.id({ prefix: "featmod" }).primaryKey(),
  module_name: model.text().unique(),
  is_gated: model.boolean().default(true),
})
