import { MiddlewareRoute } from "@medusajs/framework";

import {
  authenticateApiClient,
  checkSellerAccess,
  filterByAccessibleSellers,
} from "../../../shared/infra/http/middlewares";

export const externalSellersMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/external/sellers",
    method: ["GET"],
    middlewares: [authenticateApiClient(), filterByAccessibleSellers()],
  },
  {
    matcher: "/external/sellers",
    method: ["POST"],
    middlewares: [authenticateApiClient()],
  },
  {
    matcher: "/external/sellers/:id",
    middlewares: [authenticateApiClient(), checkSellerAccess("id")],
  },
];

