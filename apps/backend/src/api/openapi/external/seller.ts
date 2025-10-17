/**
 * @schema ExternalSeller
 * title: "External Seller"
 * description: "Seller object for external API"
 * type: object
 * required:
 *   - id
 *   - name
 *   - handle
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the seller.
 *   store_status:
 *     type: string
 *     enum: [active, inactive, suspended]
 *     description: The status of the seller's store.
 *   name:
 *     type: string
 *     description: The name of the seller.
 *   handle:
 *     type: string
 *     description: A unique handle for the seller.
 *   description:
 *     type: string
 *     nullable: true
 *     description: A description of the seller.
 *   photo:
 *     type: string
 *     nullable: true
 *     description: URL to the seller's photo.
 *   email:
 *     type: string
 *     nullable: true
 *     description: Store contact email.
 *   phone:
 *     type: string
 *     nullable: true
 *     description: Store contact phone.
 *   address_line:
 *     type: string
 *     nullable: true
 *     description: Seller address line.
 *   city:
 *     type: string
 *     nullable: true
 *     description: Seller city.
 *   state:
 *     type: string
 *     nullable: true
 *     description: Seller state.
 *   postal_code:
 *     type: string
 *     nullable: true
 *     description: Seller postal code.
 *   country_code:
 *     type: string
 *     nullable: true
 *     description: Seller country code (ISO 2-letter).
 *   tax_id:
 *     type: string
 *     nullable: true
 *     description: Seller tax ID.
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: The date with timezone at which the resource was created.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: The date with timezone at which the resource was last updated.
 */

