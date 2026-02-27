import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework";

import { AdminUpdateHomepageMediaBody } from "./validators";

export const homepageMediaMiddleware: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/homepage-media",
    middlewares: [],
  },
  {
    method: ["PUT"],
    matcher: "/admin/homepage-media",
    middlewares: [validateAndTransformBody(AdminUpdateHomepageMediaBody)],
  },
];
