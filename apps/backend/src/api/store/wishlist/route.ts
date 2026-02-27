import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  container
} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { calculateWishlistProductsPrice } from '@mercurjs/wishlist'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

import { applyTranslations, shouldTranslate } from '../../../shared/utils/apply-translations'
import customerWishlist from '../../../links/customer-wishlist'
import { createWishlistEntryWorkflow } from '../../../workflows/wishlist/workflows'
import { storeWishlistFields } from './query-config'
import { StoreCreateWishlistType, StoreCreateWishlist } from './validators'

function getCustomerIdFromRequest(req: AuthenticatedMedusaRequest): string | null {
  const fromAuth = req.auth_context?.actor_id ?? (req as { auth?: { actor_id?: string } }).auth?.actor_id
  if (fromAuth) return fromAuth

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  if (!token.startsWith('cust_')) return null

  const withoutPrefix = token.substring(5)
  const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_')
  if (lastUnderscoreIndex <= 0) return null

  return withoutPrefix.substring(0, lastUnderscoreIndex)
}

/**
 * @oas [post] /store/wishlist
 * operationId: "StoreCreateNewWishlist"
 * summary: "Create new wishlist entry"
 * description: "Creates a new wishlist entry by specifying a reference type and reference ID."
 * x-authenticated: true
 * parameters:
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/StoreCreateWishlist"
 * responses:
 *   "201":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Id of the wishlsit nad reference id.
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: The date with timezone at which the resource was created.
 *             updated_at:
 *               type: string
 *               format: date-time
 *               description: The date with timezone at which the resource was last updated.
 *             deleted_at:
 *               type: string
 *               format: date-time
 *               description: The date with timezone at which the resource was deleted.
 * tags:
 *   - Store Wishlist
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateWishlistType>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as { info: (msg: string, meta?: object) => void; warn: (msg: string, meta?: object) => void; error: (msg: string, meta?: object) => void }
  const customerId = getCustomerIdFromRequest(req)
  if (!customerId) {
    logger.warn('[WishlistPOST] 401 Unauthorized - no customerId', {
      authContext: req.auth_context,
      hasAuthHeader: !!req.headers.authorization
    })
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const body = (req.validatedBody ?? req.body) as Record<string, unknown> | undefined
  const parsed = body ? StoreCreateWishlist.safeParse(body) : { success: false as const }
  const validatedBody = parsed.success ? parsed.data : undefined

  if (!validatedBody) {
    const zodError = !parsed.success && 'error' in parsed ? parsed.error : null
    const message = zodError?.issues?.[0]?.message ?? 'reference_id is required'
    res.status(400).json({ message, type: 'invalid_data' })
    return
  }

  const input = {
    ...validatedBody,
    customer_id: customerId
  }

  logger.info('[WishlistPOST] Creating wishlist entry', { customerId, reference_id: input.reference_id, reference: input.reference })
  try {
    const { result } = await createWishlistEntryWorkflow.run({
      container: req.scope,
      input
    })

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const fields = req.queryConfig?.fields ?? storeWishlistFields

    const {
      data: [wishlist]
    } = await query.graph({
      entity: 'wishlist',
      fields,
      filters: {
        id: result.id
      }
    })

    logger.info('[WishlistPOST] Wishlist entry created successfully', { wishlistId: result.id })
    res.status(201).json({ wishlist })
  } catch (err) {
    logger.error('[WishlistPOST] Workflow failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      input
    })
    throw err
  }
}

/**
 * @oas [get] /store/wishlist
 * operationId: "StoreGetMyWishlist"
 * summary: "Get wishlist of the current user"
 * description: "Retrieves the wishlist created by the authenticated user."
 * x-authenticated: true
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to skip before starting to collect the result set.
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     required: false
 *     description: The number of items to return.
 *   - name: fields
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Comma-separated fields to include in the response.
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             wishlists:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Wishlist"
 *             count:
 *               type: integer
 *               description: The total number of items available
 *             offset:
 *               type: integer
 *               description: The number of items skipped before these items
 *             limit:
 *               type: integer
 *               description: The number of items per page
 * tags:
 *   - Store Wishlist
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getCustomerIdFromRequest(req)
  if (!customerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = req.queryConfig?.fields ?? storeWishlistFields
  const productFields = fields.map((field: string) => `wishlist.products.${field}`)
  const pagination = req.queryConfig?.pagination ?? { skip: 0, take: 50 }

  const { data: wishlists, metadata } = await query.graph({
    entity: customerWishlist.entryPoint,
    fields: [...productFields, 'wishlist.products.variants.prices.*'],
    filters: {
      customer_id: customerId
    },
    pagination
  })

  let formattedWithPrices = await calculateWishlistProductsPrice(
    container,
    wishlists
  )

  const locale = req.headers['x-locale'] as string | undefined
  if (locale && shouldTranslate(locale)) {
    const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
    const translationMap = await translationsService.getMapForLocale(locale)
    formattedWithPrices = applyTranslations(
      formattedWithPrices,
      translationMap,
      ['title', 'description', 'name']
    ) as typeof formattedWithPrices
    for (const w of formattedWithPrices) {
      if (w.products?.length) {
        for (const p of w.products) {
          if (p.categories?.length) {
            p.categories = applyTranslations(
              p.categories,
              translationMap,
              ['name']
            ) as typeof p.categories
          }
        }
      }
    }
  }

  res.json({
    wishlists: formattedWithPrices,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}
