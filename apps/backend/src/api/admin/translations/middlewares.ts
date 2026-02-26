import multer from 'multer'

import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";

import {
  AdminCreateTranslation,
  AdminGetTranslationsParams,
  AdminUpdateTranslation,
} from "./validators";

const upload = multer({ storage: multer.memoryStorage() })

export const translationsMiddleware: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/translations",
    middlewares: [validateAndTransformQuery(AdminGetTranslationsParams, {})],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations",
    middlewares: [validateAndTransformBody(AdminCreateTranslation)],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations/import",
    middlewares: [upload.single('file')],
  },
  {
    method: ["GET"],
    matcher: "/admin/translations/:id",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations/:id",
    middlewares: [validateAndTransformBody(AdminUpdateTranslation)],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/translations/:id",
    middlewares: [],
  },
];
