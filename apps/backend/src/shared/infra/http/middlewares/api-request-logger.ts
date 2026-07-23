import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse
} from '@medusajs/framework'

import { kibanaLogger } from '../../../../infrastructure/kibana-logger'

// Routes where we never log the request body (auth, OTP, password flows)
const SKIP_REQUEST_BODY_PATHS = [
  '/store/auth',
  '/store/customers/phone',
  '/store/customers/email',
  '/store/customer/reset-password',
  '/admin/auth',
  '/vendor/auth'
]

// Routes where we skip logging entirely (health checks, static assets)
const SKIP_LOGGING_PATHS = ['/health', '/favicon.ico']

function resolveApiType(
  path: string
): 'store' | 'admin' | 'vendor' | 'hooks' | 'other' {
  if (path.startsWith('/store')) return 'store'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/vendor')) return 'vendor'
  if (path.startsWith('/hooks')) return 'hooks'
  return 'other'
}

export function apiRequestLogger(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // NOT req.path/req.url: Express's app.use('/*', ...) mounts this as a
  // prefix-stripping router, and '/*' greedily matches (and strips) the
  // ENTIRE path before this middleware runs — req.path/req.url read as '/'
  // for every request until Express restores them after next(). originalUrl
  // is set once per request and never mutated by mount-prefix stripping.
  const path = (req.originalUrl || req.url || req.path || '').split('?')[0]

  if (SKIP_LOGGING_PATHS.some((p) => path.startsWith(p))) {
    return next()
  }

  const startTime = Date.now()
  const shouldSkipBody = SKIP_REQUEST_BODY_PATHS.some((p) => path.startsWith(p))

  // Capture response body by wrapping res.json
  let capturedResponseBody: Record<string, unknown> | undefined
  const originalJson = res.json.bind(res)
  res.json = (data: unknown) => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      capturedResponseBody = data as Record<string, unknown>
    }
    return originalJson(data)
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const auth = (req as any).auth_context

    kibanaLogger.apiRequest({
      method: req.method,
      path,
      host: req.headers.host,
      api_type: resolveApiType(path),
      http_status_code: res.statusCode,
      duration_ms: duration,
      query_params: Object.keys(req.query || {}).length
        ? (req.query as Record<string, unknown>)
        : undefined,
      request_body: shouldSkipBody
        ? undefined
        : (req.body as Record<string, unknown> | undefined),
      response_body: capturedResponseBody,
      ip:
        (req.headers['x-forwarded-for'] as string | undefined) ||
        req.socket?.remoteAddress,
      user_agent: req.headers['user-agent'],
      customer_id: auth?.actor_type === 'customer' ? auth.actor_id : undefined,
      seller_id: auth?.actor_type === 'seller' ? auth.actor_id : undefined
    })

    if (res.statusCode >= 500) {
      kibanaLogger.error(`${req.method} ${path} responded ${res.statusCode}`, {
        service: resolveApiType(path),
        metadata: {
          duration_ms: duration,
          response_body: capturedResponseBody
        }
      })
    }
  })

  next()
}
