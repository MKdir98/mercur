export interface CreateArticleDTO {
  handle: string
  status?: "draft" | "published"
  author_name?: string
  author_avatar?: string
  cover_image?: string
  thumbnail?: string
  title_en: string
  content_en: string
  excerpt_en?: string
  meta_title_en?: string
  meta_desc_en?: string
  title_ir?: string
  content_ir?: string
  excerpt_ir?: string
  meta_title_ir?: string
  meta_desc_ir?: string
  metadata?: Record<string, unknown>
  tag_ids?: string[]
  category_ids?: string[]
}

export interface UpdateArticleDTO {
  id: string
  handle?: string
  status?: "draft" | "published"
  author_name?: string
  author_avatar?: string
  cover_image?: string
  thumbnail?: string
  title_en?: string
  content_en?: string
  excerpt_en?: string
  meta_title_en?: string
  meta_desc_en?: string
  title_ir?: string
  content_ir?: string
  excerpt_ir?: string
  meta_title_ir?: string
  meta_desc_ir?: string
  metadata?: Record<string, unknown>
  tag_ids?: string[]
  category_ids?: string[]
}

export interface CreateArticleTagDTO {
  name: string
  handle: string
  title_en?: string
  title_ir?: string
  metadata?: Record<string, unknown>
}

export interface UpdateArticleTagDTO {
  id: string
  name?: string
  handle?: string
  title_en?: string
  title_ir?: string
  metadata?: Record<string, unknown>
}

export interface CreateArticleCategoryDTO {
  name: string
  handle: string
  title_en?: string
  title_ir?: string
  description_en?: string
  description_ir?: string
  sort_order?: number
  metadata?: Record<string, unknown>
}

export interface UpdateArticleCategoryDTO {
  id: string
  name?: string
  handle?: string
  title_en?: string
  title_ir?: string
  description_en?: string
  description_ir?: string
  sort_order?: number
  metadata?: Record<string, unknown>
}
