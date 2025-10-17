import { MiddlewareRoute } from "@medusajs/framework";

import { authenticateApiClient } from "../../../shared/infra/http/middlewares";
import { checkVariantSellerAccess } from "./utils/check-variant-seller-access";

export const externalVariantsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/external/variants",
    method: ["GET"],
    middlewares: [authenticateApiClient()],
  },
  {
    matcher: "/external/variants",
    method: ["POST"],
    middlewares: [authenticateApiClient(), checkVariantSellerAccess()],
  },
  {
    matcher: "/external/variants/:id",
    middlewares: [authenticateApiClient(), checkVariantSellerAccess()],
  },
];

