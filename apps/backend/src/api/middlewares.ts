import { defineMiddlewares } from '@medusajs/medusa'

export default defineMiddlewares({
  routes: [
    {
      matcher: '/store/payment-providers*',
      middlewares: [
        async (req, res, next) => {
          console.log('🔵 [BACKEND] Payment providers endpoint called')
          console.log('🔵 [BACKEND] Query params:', req.query)
          console.log('🔵 [BACKEND] Region ID:', req.query.region_id)
          next()
        }
      ]
    }
  ]
})
