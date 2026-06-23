import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export const AdminCreateArticleTag = z.object({
  name: z.string().min(1),
  handle: z.string().min(1),
  title_en: z.string().optional(),
  title_ir: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})
export type AdminCreateArticleTagType = z.infer<typeof AdminCreateArticleTag>

export const AdminUpdateArticleTag = z
  .object({
    name: z.string().optional(),
    handle: z.string().optional(),
    title_en: z.string().optional(),
    title_ir: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .strict()
export type AdminUpdateArticleTagType = z.infer<typeof AdminUpdateArticleTag>

export const AdminGetArticleTagsParams = createFindParams({
  offset: 0,
  limit: 50
})
export type AdminGetArticleTagsParamsType = z.infer<typeof AdminGetArticleTagsParams>
