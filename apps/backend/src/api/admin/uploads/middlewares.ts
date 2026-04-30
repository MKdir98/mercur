import { MiddlewareRoute } from '@medusajs/framework/http'

export const adminUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/uploads',
    bodyParser: false
  }
]
