import { MiddlewareRoute, validateAndTransformBody } from '@medusajs/framework'

import { VendorCreateSupportTicket } from './validators'

export const vendorSupportTicketsMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/vendor/support-tickets',
    middlewares: [validateAndTransformBody(VendorCreateSupportTicket)]
  }
]
