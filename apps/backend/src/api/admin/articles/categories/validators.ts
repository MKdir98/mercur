import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminCreateArticleCategory = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  title_en: z.string().optional(),
  title_ir: z.string().optional(),
  description_en: z.string().optional(),
  description_ir: z.string().optional(),
  sort_order: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
})
export type AdminCreateArticleCategoryType = z.infer<typeof AdminCreateArticleCategory>

export const AdminUpdateArticleCategory = z
  .object({
    name: z.string().optional(),
    handle: z.string().optional(),
    title_en: z.string().optional(),
    title_ir: z.string().optional(),
    description_en: z.string().optional(),
    description_ir: z.string().optional(),
    sort_order: z.number().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .strict()
export type AdminUpdateArticleCategoryType = z.infer<typeof AdminUpdateArticleCategory>

export const AdminGetArticleCategoriesParams = createFindParams({
  offset: 0,
  limit: 50
})
export type AdminGetArticleCategoriesParamsType = z.infer<typeof AdminGetArticleCategoriesParams>
