import { model } from '@medusajs/framework/utils'
 
export const State = model.define('state', {
  id: model.id({ prefix: 'state' }).primaryKey(),
  name: model.text().searchable(),
  country_code: model.text()
}) 