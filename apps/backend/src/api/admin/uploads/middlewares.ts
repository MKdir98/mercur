import multer from 'multer'

import { MiddlewareRoute } from '@medusajs/framework/http'

const upload = multer({ storage: multer.memoryStorage() })

export const adminUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/uploads',
    middlewares: [upload.array('files')]
  }
]
