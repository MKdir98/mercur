import { defineMiddlewares } from '@medusajs/medusa'

import { adminMiddlewares } from './admin/middlewares'
// import { externalMiddlewares } from './external/middlewares'  // Temporarily disabled
import { hooksMiddlewares } from './hooks/middlewares'
import { storeMiddlewares } from './store/middlewares'
import { vendorMiddlewares } from './vendor/middlewares'

export default defineMiddlewares({
  routes: [
    ...vendorMiddlewares,
    ...storeMiddlewares,
    ...adminMiddlewares,
    ...hooksMiddlewares,
    // ...externalMiddlewares  // Temporarily disabled
  ]
})
