import { MiddlewareRoute } from "@medusajs/framework";

import {
  authenticateApiClient,
  filterByAccessibleSellers,
} from "../../../shared/infra/http/middlewares";
import { checkProductSellerAccess } from "./utils/check-product-seller-access";

export const externalProductsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/external/products",
    method: ["GET"],
    middlewares: [authenticateApiClient(), filterByAccessibleSellers()],
  },
  {
    matcher: "/external/products",
    method: ["POST"],
    middlewares: [authenticateApiClient(), checkProductSellerAccess()],
  },
  {
    matcher: "/external/products/:id",
    middlewares: [authenticateApiClient(), checkProductSellerAccess()],
  },
];

