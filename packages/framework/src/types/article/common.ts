export interface ArticleDTO {
  id: string
  handle: string
  status: "draft" | "published"
  author_name: string | null
  author_avatar: string | null
  cover_image: string | null
  thumbnail: string | null
  title_en: string
  content_en: string
  excerpt_en: string | null
  meta_title_en: string | null
  meta_desc_en: string | null
  title_ir: string | null
  content_ir: string | null
  excerpt_ir: string | null
  meta_title_ir: string | null
  meta_desc_ir: string | null
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  tags?: ArticleTagDTO[]
  categories?: ArticleCategoryDTO[]
}

export interface ArticleTagDTO {
  id: string
  name: string
  handle: string
  title_en: string | null
  title_ir: string | null
  metadata?: Record<string, unknown>
}

export interface ArticleCategoryDTO {
  id: string
  name: string
  handle: string
  title_en: string | null
  title_ir: string | null
  description_en: string | null
  description_ir: string | null
  sort_order: number
  metadata?: Record<string, unknown>
}
