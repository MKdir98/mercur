import { model } from "@medusajs/framework/utils";

import ArticleTag from "./article-tag";
import ArticleCategory from "./article-category";

const Article = model
  .define("article", {
    id: model.id({ prefix: "art" }).primaryKey(),
    handle: model.text().unique(),
    status: model.enum(["draft", "published"]).default("draft"),
    author_name: model.text().nullable(),
    author_avatar: model.text().nullable(),
    cover_image: model.text().nullable(),
    thumbnail: model.text().nullable(),
    title_en: model.text(),
    content_en: model.text(),
    excerpt_en: model.text().nullable(),
    meta_title_en: model.text().nullable(),
    meta_desc_en: model.text().nullable(),
    title_ir: model.text().nullable(),
    content_ir: model.text().nullable(),
    excerpt_ir: model.text().nullable(),
    meta_title_ir: model.text().nullable(),
    meta_desc_ir: model.text().nullable(),
    metadata: model.json().nullable(),
    tags: model.hasMany(() => ArticleTag),
    categories: model.hasMany(() => ArticleCategory),
  })
  .cascades({
    delete: ["tags"],
  });

export default Article;
