import { model } from '@medusajs/framework/utils'

export const PostexCityMapping = model.define('postex_city_mapping', {
  id: model.id({ prefix: 'pcm' }).primaryKey(),
  city_id: model.text(),
  state_id: model.text().nullable(),
  postex_city_code: model.text().nullable(),
  postex_province_code: model.text().nullable(),
  postex_city_name: model.text().nullable(),
  postex_province_name: model.text().nullable()
}) 