import { ModuleProvider, Modules } from '@medusajs/framework/utils'

import ZarinpalGatewayProviderService from './services/zarinpal-gateway-provider'

export default ModuleProvider(Modules.PAYMENT, {
  services: [ZarinpalGatewayProviderService]
})
