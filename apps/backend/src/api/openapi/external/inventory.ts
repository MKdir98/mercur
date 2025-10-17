/**
 * @schema ExternalInventoryItem
 * title: "External Inventory Item"
 * description: "Inventory item object for external API"
 * type: object
 * required:
 *   - id
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the inventory item.
 *   sku:
 *     type: string
 *     nullable: true
 *     description: Stock keeping unit.
 *   origin_country:
 *     type: string
 *     nullable: true
 *     description: Origin country code.
 *   hs_code:
 *     type: string
 *     nullable: true
 *     description: Harmonized System code.
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
 *   requires_shipping:
 *     type: boolean
 *     description: Whether the item requires shipping.
 *   location_levels:
 *     type: array
 *     description: Inventory levels at different locations.
 *     items:
 *       $ref: "#/components/schemas/ExternalInventoryLevel"
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: Creation date.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: Last update date.
 */

/**
 * @schema ExternalInventoryLevel
 * title: "External Inventory Level"
 * description: "Inventory level object for external API"
 * type: object
 * required:
 *   - id
 *   - inventory_item_id
 *   - location_id
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the inventory level.
 *   inventory_item_id:
 *     type: string
 *     description: Inventory item ID.
 *   location_id:
 *     type: string
 *     description: Stock location ID.
 *   stocked_quantity:
 *     type: number
 *     description: Quantity in stock.
 *   reserved_quantity:
 *     type: number
 *     description: Reserved quantity.
 *   incoming_quantity:
 *     type: number
 *     description: Incoming quantity.
 *   available_quantity:
 *     type: number
 *     description: Available quantity (stocked - reserved).
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: Creation date.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: Last update date.
 */

