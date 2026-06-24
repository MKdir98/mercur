import { DAL, InferTypeOf } from "@medusajs/framework/types";
import { MedusaService } from "@medusajs/framework/utils";

import Article from "./models/article";
import ArticleTag from "./models/article-tag";
import ArticleCategory from "./models/article-category";

type InjectedDependencies = {
  articleRepository: DAL.RepositoryService<InferTypeOf<typeof Article>>;
  articleTagRepository: DAL.RepositoryService<InferTypeOf<typeof ArticleTag>>;
  articleCategoryRepository: DAL.RepositoryService<InferTypeOf<typeof ArticleCategory>>;
};

class ArticleModuleService extends MedusaService({
  Article,
  ArticleTag,
  ArticleCategory,
}) {
  protected articleRepository_: DAL.RepositoryService<InferTypeOf<typeof Article>>;
  protected articleTagRepository_: DAL.RepositoryService<InferTypeOf<typeof ArticleTag>>;
  protected articleCategoryRepository_: DAL.RepositoryService<InferTypeOf<typeof ArticleCategory>>;

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
