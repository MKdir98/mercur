import { model } from '@medusajs/framework/utils'

export const City = model.define('city', {
  id: model.id({ prefix: 'city' }).primaryKey(),
  name: model.text().searchable(),
  country_code: model.text(),
  state_id: model.text(),
  // Postex integration code for mapping
  postex_city_code: model.text()
}) 