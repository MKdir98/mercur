import { z } from 'zod'

import { applyAndAndOrOperators } from '@medusajs/medusa/api/utils/common-validators/common'
import {
  createFindParams,
  createOperatorMap,
  createSelectParams
} from '@medusajs/medusa/api/utils/validators'

export const AdminGetArticleParams = createSelectParams()

export const GetArticlesParams = z.object({
  id: z.string().optional(),
  handle: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  author_name: z.string().optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional()
})
export type AdminGetArticlesParamsType = z.infer<typeof AdminGetArticlesParams>
export const AdminGetArticlesParams = createFindParams({
  offset: 0,
  limit: 50
})
  .merge(applyAndAndOrOperators(GetArticlesParams))
  .merge(GetArticlesParams)

export type AdminCreateArticleType = z.infer<typeof AdminCreateArticle>
export const AdminCreateArticle = z.object({
  handle: z.string().min(1),
  status: z.enum(['draft', 'published']).default('draft'),
  author_name: z.string().optional(),
  author_avatar: z.string().optional(),
  cover_image: z.string().optional(),
  thumbnail: z.string().optional(),
  title_en: z.string().min(1),
  content_en: z.string().min(1),
  excerpt_en: z.string().optional(),
  meta_title_en: z.string().optional(),
  meta_desc_en: z.string().optional(),
  title_ir: z.string().optional(),
  content_ir: z.string().optional(),
  excerpt_ir: z.string().optional(),
  meta_title_ir: z.string().optional(),
  meta_desc_ir: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tag_ids: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional()
})

export type AdminUpdateArticleType = z.infer<typeof AdminUpdateArticle>
export const AdminUpdateArticle = z
  .object({
    handle: z.string().optional(),
    status: z.enum(['draft', 'published']).optional(),
    author_name: z.string().optional(),
    author_avatar: z.string().optional(),
    cover_image: z.string().optional(),
    thumbnail: z.string().optional(),
    title_en: z.string().optional(),
    content_en: z.string().optional(),
    excerpt_en: z.string().optional(),
    meta_title_en: z.string().optional(),
    meta_desc_en: z.string().optional(),
    title_ir: z.string().optional(),
    content_ir: z.string().optional(),
    excerpt_ir: z.string().optional(),
    meta_title_ir: z.string().optional(),
    meta_desc_ir: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    tag_ids: z.array(z.string()).optional(),
    category_ids: z.array(z.string()).optional()
  })
  .strict()
