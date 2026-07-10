import { model } from '@medusajs/framework/utils'

const ProductColor = model.define('product_color', {
  id: model.id({ prefix: 'prod_color' }).primaryKey(),
  value: model.text().unique(),
  hex_code: model.text()
})

export default ProductColor
