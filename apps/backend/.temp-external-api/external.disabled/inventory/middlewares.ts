import { MiddlewareRoute } from "@medusajs/framework";

import { authenticateApiClient } from "../../../shared/infra/http/middlewares";
import { checkInventorySellerAccess } from "./utils/check-inventory-seller-access";

export const externalInventoryMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/external/inventory",
    method: ["GET"],
    middlewares: [authenticateApiClient()],
  },
  {
    matcher: "/external/inventory/:id",
    middlewares: [authenticateApiClient(), checkInventorySellerAccess()],
  },
  {
    matcher: "/external/inventory/:id/adjust",
    method: ["POST"],
    middlewares: [authenticateApiClient(), checkInventorySellerAccess()],
  },
];

