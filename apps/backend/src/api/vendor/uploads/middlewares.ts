import { MiddlewareRoute } from '@medusajs/framework/http'

import { multerFilesArray } from '../../../shared/infra/http/middlewares/multer-files-array'

export const vendorUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/vendor/uploads',
    bodyParser: false,
    middlewares: [multerFilesArray('files')]
  }
]
