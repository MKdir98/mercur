import { NextFunction } from "express";

import {
  ContainerRegistrationKeys,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * Middleware to check if API client has access to the product's seller
 */
export function checkProductSellerAccess() {
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

    // For POST requests, check seller_id in body
    if (req.method === "POST") {
      const sellerId = req.body?.seller_id;

      if (!sellerId) {
        return res.status(400).json({
          message: "seller_id is required",
        });
      }

      const apiClientService = req.scope.resolve(API_CLIENT_MODULE);
      const hasAccess = await apiClientService.hasAccessToSeller(
        req.apiClient.id,
        sellerId
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have access to this seller",
        });
      }

      return next();
    }

    // For GET/PUT/DELETE requests, get product first and check its seller_id
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "seller_id"],
      filters: {
        id: productId,
      },
    });

    if (!products || products.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const product = products[0];

    const apiClientService = req.scope.resolve(API_CLIENT_MODULE);
    const hasAccess = await apiClientService.hasAccessToSeller(
      req.apiClient.id,
      product.seller_id
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have access to this product's seller",
      });
    }

    next();
  };
}

