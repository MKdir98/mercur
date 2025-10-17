import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * @oas [get] /admin/api-clients
 * operationId: "AdminListApiClients"
 * summary: "List API Clients"
 * description: "Retrieves a list of API clients."
 * x-authenticated: true
 * parameters:
 *   - name: offset
 *     in: query
 *     schema:
 *       type: number
 *     description: The number of items to skip
 *   - name: limit
 *     in: query
 *     schema:
 *       type: number
 *     description: The number of items to return
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             api_clients:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/AdminApiClient"
 *             count:
 *               type: integer
 *             offset:
 *               type: integer
 *             limit:
 *               type: integer
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: api_clients, metadata } = await query.graph({
    entity: "api_client",
    fields: req.queryConfig?.fields || ["*"],
    pagination: {
      skip: req.query.offset ? Number(req.query.offset) : 0,
      take: req.query.limit ? Number(req.query.limit) : 20,
    },
  });

  // Remove sensitive data
  const sanitized = api_clients.map((client: any) => ({
    ...client,
    api_secret: undefined,
  }));

  res.json({
    api_clients: sanitized,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
}

/**
 * @oas [post] /admin/api-clients
 * operationId: "AdminCreateApiClient"
 * summary: "Create API Client"
 * description: "Creates a new API client."
 * x-authenticated: true
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - name
 *         properties:
 *           name:
 *             type: string
 *             description: Client name
 *           description:
 *             type: string
 *             description: Client description
 *           rate_limit:
 *             type: number
 *             description: Rate limit (requests per minute)
 *           metadata:
 *             type: object
 *             description: Additional metadata
 * responses:
 *   "201":
 *     description: Created
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             api_client:
 *               $ref: "#/components/schemas/AdminApiClient"
 *             credentials:
 *               type: object
 *               properties:
 *                 api_key:
 *                   type: string
 *                   description: API Key (save this, it won't be shown again)
 *                 api_secret:
 *                   type: string
 *                   description: API Secret (save this, it won't be shown again)
 *   "400":
 *     description: Bad Request
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);

  // Generate credentials
  const { apiKey, apiSecret } = apiClientService.generateApiCredentials();

  // Hash the secret before storing
  const hashedSecret = apiClientService.hashSecret(apiSecret);

  // Create the client
  const api_client = await apiClientService.createApiClients({
    ...req.body,
    api_key: apiKey,
    api_secret: hashedSecret,
    is_active: true,
  });

  res.status(201).json({
    api_client: {
      ...api_client,
      api_secret: undefined,
    },
    credentials: {
      api_key: apiKey,
      api_secret: apiSecret, // Return unhashed secret only once
    },
  });
}

