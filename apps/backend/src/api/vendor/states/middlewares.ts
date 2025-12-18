import { MiddlewareRoute, validateAndTransformQuery } from '@medusajs/framework'

import { vendorStatesQueryConfig } from './query-config'
import { VendorGetStatesParams } from './validators'

export const vendorStatesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/states',
    middlewares: [
      validateAndTransformQuery(
        VendorGetStatesParams,
        vendorStatesQueryConfig.list
      )
    ]
  }
]

















