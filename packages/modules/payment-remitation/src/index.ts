import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import RemitationGatewayProviderService from "./services/remitation-gateway-provider"

export { remitationGatewayResponseIsPaid } from "./core/remitation-provider"

export default ModuleProvider(Modules.PAYMENT, {
  services: [RemitationGatewayProviderService],
})
