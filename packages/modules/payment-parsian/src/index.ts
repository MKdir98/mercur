import { ModuleProvider, Modules } from '@medusajs/framework/utils'

import ParsianGatewayProviderService from './services/parsian-gateway-provider'

export { getParsianGatewayUrls, type ParsianGatewayUrls } from './parsian-urls'

export default ModuleProvider(Modules.PAYMENT, {
  services: [ParsianGatewayProviderService],
})
