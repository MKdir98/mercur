import { NextFunction } from "express";

import {
  ContainerRegistrationKeys,
  MedusaRequest,
  MedusaResponse,
  Modules,
} from "@medusajs/framework";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * Middleware to check if API client has access to the inventory item's variant's product's seller
 */
export function checkInventorySellerAccess() {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: NextFunction
  ) => {
    if (!req.apiClient) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const inventoryItemId = req.params.id;

    if (!inventoryItemId) {
      return res.status(400).json({
        message: "Inventory item ID is required",
      });
    }

    // Get the inventory item to find its variant
    const inventoryService = req.scope.resolve(Modules.INVENTORY);
    
    try {
      const inventoryItem = await inventoryService.retrieveInventoryItem(
        inventoryItemId
      );

      if (!inventoryItem) {
        return res.status(404).json({
          message: "Inventory item not found",
        });
      }

      // Get the variant associated with this inventory item
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id", "product.seller_id"],
        filters: {
          inventory_items: {
            inventory_item_id: inventoryItemId,
          },
        },
      });

      if (!variants || variants.length === 0) {
        return res.status(404).json({
          message: "Variant not found for this inventory item",
        });
      }

      const variant = variants[0];

      const apiClientService = req.scope.resolve(API_CLIENT_MODULE);
      const hasAccess = await apiClientService.hasAccessToSeller(
        req.apiClient.id,
        variant.product.seller_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You do not have access to this inventory item's product seller",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: "Error checking inventory access",
      });
    }
  };
}

