import { MiddlewareRoute } from "@medusajs/framework";

import { externalInventoryMiddlewares } from "./inventory/middlewares";
import { externalProductsMiddlewares } from "./products/middlewares";
import { externalSellersMiddlewares } from "./sellers/middlewares";
import { externalVariantsMiddlewares } from "./variants/middlewares";

export const externalMiddlewares: MiddlewareRoute[] = [
  ...externalSellersMiddlewares,
  ...externalProductsMiddlewares,
  ...externalVariantsMiddlewares,
  ...externalInventoryMiddlewares,
];

