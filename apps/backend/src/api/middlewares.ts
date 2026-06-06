import { defineMiddlewares } from '@medusajs/medusa'

import { apiRequestLogger } from '../shared/infra/http/middlewares/api-request-logger'
import { adminMiddlewares } from './admin/middlewares'
import { storeMiddlewares } from './store/middlewares'
import { vendorMiddlewares } from './vendor/middlewares'

export default defineMiddlewares({
  routes: [
    // Log every inbound request to doorfestival-api-requests index in Kibana
    {
      matcher: '/*',
      middlewares: [apiRequestLogger]
    },
    ...adminMiddlewares,
    ...storeMiddlewares,
    ...vendorMiddlewares
  ]
})
