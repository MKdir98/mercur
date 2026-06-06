import { Module } from '@medusajs/framework/utils'

import ElasticsearchModuleService from './service'

export const ELASTICSEARCH_MODULE = 'elasticsearch'
export { ElasticsearchModuleService }
export type { ElasticsearchProduct, SearchParams, SearchResults } from './service'

export default Module(ELASTICSEARCH_MODULE, {
  service: ElasticsearchModuleService,
})
