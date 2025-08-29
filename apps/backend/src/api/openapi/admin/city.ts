/**
 * @schema AdminCity
 * title: "City"
 * description: "City object for admin"
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the city.
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: The date with timezone at which the resource was created.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: The date with timezone at which the resource was last updated.
 *   name:
 *     type: string
 *     description: The name of the city.
 *   country_code:
 *     type: string
 *     description: The country code of the city.
 */

/**
 * @schema AdminCreateCity
 * title: "Create City"
 * description: "Create city request object"
 * type: object
 * required:
 *   - name
 *   - country_code
 * properties:
 *   name:
 *     type: string
 *     description: The name of the city.
 *   country_code:
 *     type: string
 *     description: The country code of the city (2 letter ISO code).
 *     minLength: 2
 *     maxLength: 2
 */ 