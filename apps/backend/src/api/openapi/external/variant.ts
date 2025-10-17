/**
 * @schema ExternalVariant
 * title: "External Product Variant"
 * description: "Product variant object for external API"
 * type: object
 * required:
 *   - id
 *   - title
 *   - product_id
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the variant.
 *   title:
 *     type: string
 *     description: Variant title.
 *   product_id:
 *     type: string
 *     description: Product ID.
 *   sku:
 *     type: string
 *     nullable: true
 *     description: Stock keeping unit.
 *   barcode:
 *     type: string
 *     nullable: true
 *     description: Barcode.
 *   ean:
 *     type: string
 *     nullable: true
 *     description: European Article Number.
 *   upc:
 *     type: string
 *     nullable: true
 *     description: Universal Product Code.
 *   allow_backorder:
 *     type: boolean
 *     description: Whether backorders are allowed.
 *   manage_inventory:
 *     type: boolean
 *     description: Whether to manage inventory for this variant.
 *   hs_code:
 *     type: string
 *     nullable: true
 *     description: Harmonized System code.
 *   origin_country:
 *     type: string
 *     nullable: true
 *     description: Origin country code.
 *   mid_code:
 *     type: string
 *     nullable: true
 *     description: MID code.
 *   material:
 *     type: string
 *     nullable: true
 *     description: Material.
 *   weight:
 *     type: number
 *     nullable: true
 *     description: Weight.
 *   length:
 *     type: number
 *     nullable: true
 *     description: Length.
 *   height:
 *     type: number
 *     nullable: true
 *     description: Height.
 *   width:
 *     type: number
 *     nullable: true
 *     description: Width.
 *   options:
 *     type: object
 *     additionalProperties:
 *       type: string
 *     description: Variant option values.
 *   prices:
 *     type: array
 *     description: Variant prices.
 *     items:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         amount:
 *           type: number
 *         currency_code:
 *           type: string
 *         region_id:
 *           type: string
 *           nullable: true
 *   inventory_quantity:
 *     type: number
 *     description: Available inventory quantity.
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: Creation date.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: Last update date.
 */

