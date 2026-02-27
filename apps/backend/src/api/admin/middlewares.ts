import { MiddlewareRoute } from '@medusajs/framework'

// import { adminApiClientsMiddlewares } from './api-clients/middlewares'  // Temporarily disabled
import { adminUploadMiddlewares } from './uploads/middlewares'
import { adminProductCategoriesMiddlewares } from './product-categories/middlewares'
import { attributeMiddlewares } from './attributes/middlewares'
import { citiesMiddlewares } from './cities/middlewares'
import { commissionMiddlewares } from './commission/middlewares'
import { configurationMiddleware } from './configuration/middlewares'
import { homepageMediaMiddleware } from './homepage-media/middlewares'
import { translationsMiddleware } from './translations/middlewares'
import { orderSetsMiddlewares } from './order-sets/middlewares'
import { adminProductsMiddlewares } from './products/middlewares'
import { requestsMiddlewares } from './requests/middlewares'
import { returnRequestsMiddlewares } from './return-request/middlewares'
import { reviewsMiddlewares } from './reviews/middlewares'
import { sellerMiddlewares } from './sellers/middlewares'

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminUploadMiddlewares,
  ...adminProductCategoriesMiddlewares,
  ...orderSetsMiddlewares,
  ...requestsMiddlewares,
  ...configurationMiddleware,
  ...homepageMediaMiddleware,
  ...translationsMiddleware,
  ...returnRequestsMiddlewares,
  ...commissionMiddlewares,
  ...sellerMiddlewares,
  ...reviewsMiddlewares,
  ...attributeMiddlewares,
  ...adminProductsMiddlewares,
  ...citiesMiddlewares,
  // ...adminApiClientsMiddlewares  // Temporarily disabled
]
