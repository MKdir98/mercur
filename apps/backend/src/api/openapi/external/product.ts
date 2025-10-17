/**
 * @schema ExternalProduct
 * title: "External Product"
 * description: "Product object for external API"
 * type: object
 * required:
 *   - id
 *   - title
 *   - seller_id
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the product.
 *   title:
 *     type: string
 *     description: Product title.
 *   subtitle:
 *     type: string
 *     nullable: true
 *     description: Product subtitle.
 *   description:
 *     type: string
 *     nullable: true
 *     description: Product description.
 *   handle:
 *     type: string
 *     description: Unique handle for the product.
 *   seller_id:
 *     type: string
 *     description: Seller ID that owns this product.
 *   is_giftcard:
 *     type: boolean
 *     description: Whether the product is a gift card.
 *   status:
 *     type: string
 *     enum: [draft, proposed, published, rejected]
 *     description: Product status.
 *   thumbnail:
 *     type: string
 *     nullable: true
 *     description: Thumbnail URL.
 *   collection_id:
 *     type: string
 *     nullable: true
 *     description: Collection ID.
 *   type_id:
 *     type: string
 *     nullable: true
 *     description: Product type ID.
 *   variants:
 *     type: array
 *     description: Product variants.
 *     items:
 *       $ref: "#/components/schemas/ExternalVariant"
 *   images:
 *     type: array
 *     description: Product images.
 *     items:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         url:
 *           type: string
 *   options:
 *     type: array
 *     description: Product options.
 *     items:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         values:
 *           type: array
 *           items:
 *             type: string
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: Creation date.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: Last update date.
 */

