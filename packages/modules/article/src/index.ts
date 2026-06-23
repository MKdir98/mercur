import { Module } from "@medusajs/framework/utils";

import ArticleModuleService from "./service";

export const ARTICLE_MODULE = "article";
export { ArticleModuleService };

export default Module(ARTICLE_MODULE, {
  service: ArticleModuleService,
});
