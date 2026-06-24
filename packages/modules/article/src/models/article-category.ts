import { model } from "@medusajs/framework/utils";

import Article from "./article";

const ArticleCategory = model.define("article_category", {
  id: model.id({ prefix: "art_cat" }).primaryKey(),
  name: model.text(),
  handle: model.text().unique(),
  title_en: model.text().nullable(),
  title_ir: model.text().nullable(),
  description_en: model.text().nullable(),
  description_ir: model.text().nullable(),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
  article: model.belongsTo(() => Article, { mappedBy: "categories" }),
});

export default ArticleCategory;
