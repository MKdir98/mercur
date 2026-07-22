import { MedusaService } from "@medusajs/framework/utils"

import { FeatureModule } from "./models/feature-module"
import { FeatureGrant } from "./models/feature-grant"

class FeatureAccessModuleService extends MedusaService({
  FeatureModule,
  FeatureGrant,
}) {}

export default FeatureAccessModuleService
