export const articleFields = [
  'id',
  'handle',
  'status',
  'author_name',
  'author_avatar',
  'cover_image',
  'thumbnail',
  'title_en',
  'content_en',
  'excerpt_en',
  'meta_title_en',
  'meta_desc_en',
  'title_ir',
  'content_ir',
  'excerpt_ir',
  'meta_title_ir',
  'meta_desc_ir',
  'metadata',
  'created_at',
  'updated_at',
  'tags.*',
  'categories.*'
]

export const articleRelations: string[] = []

export const defaultArticleConfig = {
  entity: 'article',
  fields: articleFields,
  relations: articleRelations,
  isList: true
}
