import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import * as QueryConfig from './query-config'
import {
  AdminCreateCity,
  AdminGetCitiesParams,
  AdminGetCityParams,
  AdminUpdateCity
} from './validators'

export const citiesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/cities',
    middlewares: [
      validateAndTransformQuery(
        AdminGetCitiesParams,
        QueryConfig.listCityQueryConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/cities',
    middlewares: [
      validateAndTransformBody(AdminCreateCity),
      validateAndTransformQuery(
        AdminGetCityParams,
        QueryConfig.retrieveCityQueryConfig
      )
    ]
  }
] 