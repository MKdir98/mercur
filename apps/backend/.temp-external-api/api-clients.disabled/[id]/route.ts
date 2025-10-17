import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * @oas [get] /admin/api-clients/{id}
 * operationId: "AdminGetApiClient"
 * summary: "Get API Client"
 * description: "Retrieves an API client by ID."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             api_client:
 *               $ref: "#/components/schemas/AdminApiClient"
 *   "404":
 *     description: Not Found
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

  const { data: clients } = await query.graph({
    entity: "api_client",
    fields: ["*"],
    filters: {
      id: req.params.id,
    },
  });

  if (!clients || clients.length === 0) {
    return res.status(404).json({
      message: "API Client not found",
    });
  }

  const api_client = clients[0];

  res.json({
    api_client: {
      ...api_client,
      api_secret: undefined,
    },
  });
}

/**
 * @oas [put] /admin/api-clients/{id}
 * operationId: "AdminUpdateApiClient"
 * summary: "Update API Client"
 * description: "Updates an API client."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *           description:
 *             type: string
 *           is_active:
 *             type: boolean
 *           rate_limit:
 *             type: number
 *           metadata:
 *             type: object
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             api_client:
 *               $ref: "#/components/schemas/AdminApiClient"
 *   "404":
 *     description: Not Found
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);

  const api_client = await apiClientService.updateApiClients({
    id: req.params.id,
    ...req.body,
  });

  res.json({
    api_client: {
      ...api_client,
      api_secret: undefined,
    },
  });
}

/**
 * @oas [delete] /admin/api-clients/{id}
 * operationId: "AdminDeleteApiClient"
 * summary: "Delete API Client"
 * description: "Deletes an API client."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The API client ID
 * responses:
 *   "200":
 *     description: OK
 *   "404":
 *     description: Not Found
 * tags:
 *   - Admin API Clients
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const apiClientService = req.scope.resolve(API_CLIENT_MODULE);

  await apiClientService.deleteApiClients(req.params.id);

  res.json({ success: true });
}

