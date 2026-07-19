import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError, MedusaErrorTypes } from '@medusajs/framework/utils'

import { ATTRIBUTE_MODULE, AttributeModuleService } from '@mercurjs/attribute'

const HEX_CODE_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
const COLOR_OPTION_TITLES = ['Color', 'color', 'COLOR', 'Colour', 'colour', 'رنگ']

/**
 * @oas [get] /admin/product-colors
 * operationId: "AdminListProductColors"
 * summary: "List Product Colors"
 * description: "Lists every distinct value used by a 'Color' product option across all products, merged with any RGB/hex already assigned to that value."
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product_colors:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     nullable: true
 *                   value:
 *                     type: string
 *                   hex_code:
 *                     type: string
 *                     nullable: true
 * tags:
 *   - Admin Product Colors
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productColorService: AttributeModuleService = req.scope.resolve(ATTRIBUTE_MODULE)

  const { data: colorOptions } = await query.graph({
    entity: 'product_option',
    fields: ['id'],
    filters: { title: { $in: COLOR_OPTION_TITLES } }
  })

  const optionIds = colorOptions.map((option) => option.id)

  const distinctValues = new Set<string>()

  if (optionIds.length) {
    const { data: optionValues } = await query.graph({
      entity: 'product_option_value',
      fields: ['value'],
      filters: { option_id: optionIds }
    })

    optionValues.forEach((optionValue) => distinctValues.add(optionValue.value))
  }

  const canonicalColors = await productColorService.listProductColors()
  const canonicalByValue = new Map(canonicalColors.map((color) => [color.value, color]))

  const merged = Array.from(new Set([...distinctValues, ...canonicalByValue.keys()])).map(
    (value) => {
      const canonical = canonicalByValue.get(value)
      return {
        id: canonical?.id ?? null,
        value,
        hex_code: canonical?.hex_code ?? null
      }
    }
  )

  merged.sort((a, b) => a.value.localeCompare(b.value))

  return res.json({ product_colors: merged })
}

/**
 * @oas [post] /admin/product-colors
 * operationId: "AdminUpsertProductColor"
 * summary: "Set Product Color RGB"
 * description: "Creates or updates the canonical RGB/hex value for a color name, upserting by the 'value' string."
 * x-authenticated: true
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - value
 *           - hex_code
 *         properties:
 *           value:
 *             type: string
 *           hex_code:
 *             type: string
 *             description: Hex color code, e.g. "#000000".
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             product_color:
 *               type: object
 * tags:
 *   - Admin Product Colors
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { value?: string; hex_code?: string }
  const value = body.value?.trim()
  const hexCode = body.hex_code?.trim()

  if (!value) {
    throw new MedusaError(MedusaErrorTypes.INVALID_DATA, `'value' is required`)
  }

  if (!hexCode || !HEX_CODE_REGEX.test(hexCode)) {
    throw new MedusaError(
      MedusaErrorTypes.INVALID_DATA,
      `'hex_code' must be a valid hex color, e.g. "#000000"`
    )
  }

  const productColorService: AttributeModuleService = req.scope.resolve(ATTRIBUTE_MODULE)

  const existing = await productColorService.listProductColors({ value })

  const [productColor] = existing.length
    ? await productColorService.updateProductColors([
        { id: existing[0].id, hex_code: hexCode }
      ])
    : await productColorService.createProductColors([{ value, hex_code: hexCode }])

  return res.json({ product_color: productColor })
}
