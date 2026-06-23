export const storeArticleFields = [
  'id',
  'handle',
  'status',
  'author_name',
  'author_avatar',
  'cover_image',
  'thumbnail',
  'title_en',
  'excerpt_en',
  'title_ir',
  'excerpt_ir',
  'meta_title_en',
  'meta_desc_en',
  'meta_title_ir',
  'meta_desc_ir',
  'created_at',
  'updated_at',
  'tags.*',
  'categories.*'
]

export const storeArticleDetailFields = [
  ...storeArticleFields,
  'content_en',
  'content_ir'
]

export const defaultStoreArticleConfig = {
  entity: 'article',
  fields: storeArticleFields,
  relations: [],
  isList: true
}

export const defaultStoreArticleDetailConfig = {
  entity: 'article',
  fields: storeArticleDetailFields,
  relations: ['tags', 'categories'],
  isList: false
}
