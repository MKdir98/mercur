import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";

/**
 * @oas [get] /external/inventory/{id}
 * operationId: "ExternalGetInventoryItem"
 * summary: "Get Inventory Item"
 * description: "Retrieves an inventory item by ID."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The inventory item ID
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             inventory_item:
 *               $ref: "#/components/schemas/ExternalInventoryItem"
 *   "404":
 *     description: Not Found
 * tags:
 *   - External API
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const inventoryService = req.scope.resolve(Modules.INVENTORY);

  const inventoryItem = await inventoryService.retrieveInventoryItem(
    req.params.id,
    {
      relations: ["location_levels"],
    }
  );

  if (!inventoryItem) {
    return res.status(404).json({
      message: "Inventory item not found",
    });
  }

  res.json({ inventory_item: inventoryItem });
}

/**
 * @oas [put] /external/inventory/{id}
 * operationId: "ExternalUpdateInventoryLevel"
 * summary: "Update Inventory Level"
 * description: "Updates inventory level for a variant at a specific location."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The inventory item ID
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - location_id
 *         properties:
 *           location_id:
 *             type: string
 *             description: Stock location ID
 *           stocked_quantity:
 *             type: number
 *             description: The quantity to set (will replace current quantity)
 *           incoming_quantity:
 *             type: number
 *             description: Incoming quantity
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             inventory_level:
 *               $ref: "#/components/schemas/ExternalInventoryLevel"
 *   "400":
 *     description: Bad Request
 *   "403":
 *     description: Forbidden
 *   "404":
 *     description: Not Found
 * tags:
 *   - External API
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const inventoryService = req.scope.resolve(Modules.INVENTORY);

  const { location_id, stocked_quantity, incoming_quantity } = req.body;

  if (!location_id) {
    return res.status(400).json({
      message: "location_id is required",
    });
  }

  // Update the inventory level
  const inventoryLevel = await inventoryService.updateInventoryLevels({
    inventory_item_id: req.params.id,
    location_id,
    stocked_quantity,
    incoming_quantity,
  });

  res.json({ inventory_level: inventoryLevel });
}

/**
 * @oas [post] /external/inventory/{id}/adjust
 * operationId: "ExternalAdjustInventory"
 * summary: "Adjust Inventory"
 * description: "Adjusts inventory quantity by adding or subtracting from current quantity."
 * x-authenticated: true
 * security:
 *   - api_key: []
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 *     description: The inventory item ID
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - location_id
 *           - adjustment
 *         properties:
 *           location_id:
 *             type: string
 *             description: Stock location ID
 *           adjustment:
 *             type: number
 *             description: Quantity adjustment (positive to add, negative to subtract)
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             inventory_level:
 *               $ref: "#/components/schemas/ExternalInventoryLevel"
 *   "400":
 *     description: Bad Request
 *   "403":
 *     description: Forbidden
 * tags:
 *   - External API
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const inventoryService = req.scope.resolve(Modules.INVENTORY);

  const { location_id, adjustment } = req.body;

  if (!location_id || adjustment === undefined) {
    return res.status(400).json({
      message: "location_id and adjustment are required",
    });
  }

  // Adjust inventory
  const inventoryLevel = await inventoryService.adjustInventory(
    req.params.id,
    location_id,
    adjustment
  );

  res.json({ inventory_level: inventoryLevel });
}

