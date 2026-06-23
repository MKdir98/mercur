import { EntityManager } from "@mikro-orm/knex";
import { Context, DAL, InferTypeOf } from "@medusajs/framework/types";
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";

import Article from "./models/article";
import ArticleTag from "./models/article-tag";
import ArticleCategory from "./models/article-category";

type Article = InferTypeOf<typeof Article>;
type ArticleTag = InferTypeOf<typeof ArticleTag>;
type ArticleCategory = InferTypeOf<typeof ArticleCategory>;

type InjectedDependencies = {
  articleRepository: DAL.RepositoryService<Article>;
  articleTagRepository: DAL.RepositoryService<ArticleTag>;
  articleCategoryRepository: DAL.RepositoryService<ArticleCategory>;
};

class ArticleModuleService extends MedusaService({
  Article,
  ArticleTag,
  ArticleCategory,
}) {
  protected articleRepository_: DAL.RepositoryService<Article>;
  protected articleTagRepository_: DAL.RepositoryService<ArticleTag>;
  protected articleCategoryRepository_: DAL.RepositoryService<ArticleCategory>;

  constructor({
    articleRepository,
    articleTagRepository,
    articleCategoryRepository,
  }: InjectedDependencies) {
    super(...arguments);
    this.articleRepository_ = articleRepository;
    this.articleTagRepository_ = articleTagRepository;
    this.articleCategoryRepository_ = articleCategoryRepository;
  }
}

export default ArticleModuleService;
