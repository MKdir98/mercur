import { ModuleProvider, Modules } from '@medusajs/framework/utils'

import SepGatewayProviderService from './services/sep-gateway-provider'

export default ModuleProvider(Modules.PAYMENT, {
  services: [SepGatewayProviderService],
})
