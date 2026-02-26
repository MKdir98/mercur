import { MiddlewareRoute } from '@medusajs/framework'

export const adminProductCategoriesMiddlewares: MiddlewareRoute[] = [
  {
    method: ['PATCH'],
    matcher: '/admin/product-categories/:id'
  }
]
