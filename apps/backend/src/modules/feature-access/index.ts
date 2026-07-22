import { Module } from "@medusajs/framework/utils"

import FeatureAccessModuleService from "./service"

export const FEATURE_ACCESS_MODULE = "feature_access"
export { FeatureAccessModuleService }

export default Module(FEATURE_ACCESS_MODULE, {
  service: FeatureAccessModuleService,
})
