import { model } from "@medusajs/framework/utils";

const ArticleTag = model.define("article_tag", {
  id: model.id({ prefix: "art_tag" }).primaryKey(),
  name: model.text(),
  handle: model.text().unique(),
  title_en: model.text().nullable(),
  title_ir: model.text().nullable(),
  metadata: model.json().nullable(),
});

export default ArticleTag;
