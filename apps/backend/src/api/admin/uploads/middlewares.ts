import { MiddlewareRoute } from '@medusajs/framework/http'

import { multerFilesArray } from '../../../shared/infra/http/middlewares/multer-files-array'

export const adminUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/uploads',
    middlewares: [multerFilesArray('files')]
  }
]
