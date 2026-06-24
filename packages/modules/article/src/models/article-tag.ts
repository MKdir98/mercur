import { model } from "@medusajs/framework/utils";

import Article from "./article";

const ArticleTag = model.define("article_tag", {
  id: model.id({ prefix: "art_tag" }).primaryKey(),
  name: model.text(),
  handle: model.text().unique(),
  title_en: model.text().nullable(),
  title_ir: model.text().nullable(),
  metadata: model.json().nullable(),
  article: model.belongsTo(() => Article, { mappedBy: "tags" }),
});

export default ArticleTag;
