import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * @oas [get] /external/inventory
 * operationId: "ExternalListInventoryLevels"
 * summary: "List Inventory Levels"
 * description: "Retrieves inventory levels for variants."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: variant_id
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by variant ID
 *   - name: location_id
 *     in: query
 *     schema:
 *       type: string
 *     description: Filter by location ID
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
 *             inventory_levels:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ExternalInventoryLevel"
 *             count:
 *               type: integer
 *             offset:
 *               type: integer
 *             limit:
 *               type: integer
 * tags:
 *   - External API
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const inventoryService = req.scope.resolve(Modules.INVENTORY);

  const filters: any = {};

  if (req.query.variant_id) {
    filters.variant_id = req.query.variant_id;
  }

  if (req.query.location_id) {
    filters.location_id = req.query.location_id;
  }

  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const [inventory_levels, count] =
    await inventoryService.listAndCountInventoryLevels(filters, {
      skip: offset,
      take: limit,
    });

  res.json({
    inventory_levels,
    count,
    offset,
    limit,
  });
}

