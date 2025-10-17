import { NextFunction } from "express";

import {
  ContainerRegistrationKeys,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";

import { API_CLIENT_MODULE } from "@mercurjs/api-client";

/**
 * Middleware to check if API client has access to the variant's product's seller
 */
export function checkVariantSellerAccess() {
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

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // For POST requests, check product_id in body
    if (req.method === "POST") {
      const productId = req.body?.product_id;

      if (!productId) {
        return res.status(400).json({
          message: "product_id is required",
        });
      }

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

      return next();
    }

    // For GET/PUT/DELETE requests, get variant and its product
    const variantId = req.params.id;

    if (!variantId) {
      return res.status(400).json({
        message: "Variant ID is required",
      });
    }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id", "product.seller_id"],
      filters: {
        id: variantId,
      },
    });

    if (!variants || variants.length === 0) {
      return res.status(404).json({
        message: "Variant not found",
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
        message: "You do not have access to this variant's product seller",
      });
    }

    next();
  };
}

