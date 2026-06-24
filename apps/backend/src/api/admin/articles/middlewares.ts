import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import * as QueryConfig from './query-config'
import {
  AdminCreateArticle,
  AdminGetArticleParams,
  AdminGetArticlesParams,
  AdminUpdateArticle
} from './validators'
import {
  AdminCreateArticleTag,
  AdminUpdateArticleTag
} from './tags/validators'
import {
  AdminCreateArticleCategory,
  AdminUpdateArticleCategory
} from './categories/validators'

export const articleMiddlewares: MiddlewareRoute[] = [
  {
    method: ['GET'],
    matcher: '/admin/articles',
    middlewares: [
      validateAndTransformQuery(
        AdminGetArticlesParams,
        QueryConfig.defaultArticleConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/articles',
    middlewares: [
      validateAndTransformBody(AdminCreateArticle),
      validateAndTransformQuery(
        AdminGetArticleParams,
        QueryConfig.defaultArticleConfig
      )
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/articles/:id',
    middlewares: [
      validateAndTransformQuery(
        AdminGetArticleParams,
        QueryConfig.defaultArticleConfig
      )
    ]
  },
  {
    method: ['POST'],
    matcher: '/admin/articles/:id',
    middlewares: [
      validateAndTransformBody(AdminUpdateArticle),
      validateAndTransformQuery(
        AdminGetArticleParams,
        QueryConfig.defaultArticleConfig
      )
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/admin/articles/:id',
    middlewares: []
  },
  {
    method: ['GET'],
    matcher: '/admin/articles/tags',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/articles/tags',
    middlewares: [
      validateAndTransformBody(AdminCreateArticleTag)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/articles/tags/:id',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/articles/tags/:id',
    middlewares: [
      validateAndTransformBody(AdminUpdateArticleTag)
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/admin/articles/tags/:id',
    middlewares: []
  },
  {
    method: ['GET'],
    matcher: '/admin/articles/categories',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/articles/categories',
    middlewares: [
      validateAndTransformBody(AdminCreateArticleCategory)
    ]
  },
  {
    method: ['GET'],
    matcher: '/admin/articles/categories/:id',
    middlewares: []
  },
  {
    method: ['POST'],
    matcher: '/admin/articles/categories/:id',
    middlewares: [
      validateAndTransformBody(AdminUpdateArticleCategory)
    ]
  },
  {
    method: ['DELETE'],
    matcher: '/admin/articles/categories/:id',
    middlewares: []
  }
]
