import multer from 'multer'

import {
  MiddlewareRoute,
  unlessPath,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";

import {
  AdminCreateTranslation,
  AdminGenerateTranslation,
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
    bodyParser: false,
    middlewares: [upload.single('file')],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations/generate",
    middlewares: [validateAndTransformBody(AdminGenerateTranslation)],
  },
  {
    method: ["GET"],
    matcher: "/admin/translations/:id",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations/:id",
    middlewares: [
      unlessPath(
        /.*\/translations\/(import|generate)/,
        validateAndTransformBody(AdminUpdateTranslation)
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/translations/:id/refresh",
    middlewares: [],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/translations/:id",
    middlewares: [],
  },
];
