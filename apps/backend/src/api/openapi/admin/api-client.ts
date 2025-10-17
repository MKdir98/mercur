/**
 * @schema AdminApiClient
 * title: "Admin API Client"
 * description: "API Client object for admin"
 * type: object
 * required:
 *   - id
 *   - name
 *   - api_key
 * properties:
 *   id:
 *     type: string
 *     description: The unique identifier of the API client.
 *   name:
 *     type: string
 *     description: Name of the API client.
 *   description:
 *     type: string
 *     nullable: true
 *     description: Description of the API client.
 *   api_key:
 *     type: string
 *     description: API key for authentication.
 *   is_active:
 *     type: boolean
 *     description: Whether the client is active.
 *   rate_limit:
 *     type: number
 *     nullable: true
 *     description: Rate limit (requests per minute).
 *   metadata:
 *     type: object
 *     nullable: true
 *     description: Additional metadata.
 *   created_at:
 *     type: string
 *     format: date-time
 *     description: Creation date.
 *   updated_at:
 *     type: string
 *     format: date-time
 *     description: Last update date.
 */

