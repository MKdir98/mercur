import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StoreStatus } from '@mercurjs/framework'
import { TRANSLATIONS_MODULE, TranslationsModuleService } from '@mercurjs/translations'

import { applyTranslations, shouldTranslate } from '../../../shared/utils/apply-translations'

/**
 * @oas [get] /store/seller
 * operationId: "StoreGetSellers"
 * summary: "Get sellers"
 * description: "Retrieves the seller list."
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
 *             products:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/StoreSeller"
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
 *   - Store Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  let { data: sellers, metadata } = await query.graph({
    entity: 'seller',
    fields: req.queryConfig.fields,
    filters: { store_status: StoreStatus.ACTIVE },
    pagination: req.queryConfig.pagination
  })

  const locale = req.headers['x-locale'] as string | undefined
  if (locale && shouldTranslate(locale) && sellers?.length) {
    const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
    const translationMap = await translationsService.getMapForLocale(locale)
    sellers = applyTranslations(sellers, translationMap, ['name', 'description']) as typeof sellers
  }

  res.json({
    sellers,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}
