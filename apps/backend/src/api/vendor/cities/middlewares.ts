import { MiddlewareRoute, validateAndTransformQuery } from '@medusajs/framework'

import { vendorCitiesQueryConfig } from './query-config'
import { VendorGetCitiesParams } from './validators'

export const vendorCitiesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/vendor/cities',
    middlewares: [
      validateAndTransformQuery(
        VendorGetCitiesParams,
        vendorCitiesQueryConfig.list
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/vendor/cities/:id',
    middlewares: [
      validateAndTransformQuery(
        VendorGetCitiesParams,
        vendorCitiesQueryConfig.retrieve
      )
    ]
  }
] 