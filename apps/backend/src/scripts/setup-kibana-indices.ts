/**
 * Run once against your Kibana/Elasticsearch server to create the three index
 * templates for doorfestival logging.
 *
 * Usage:
 *   cd apps/backend
 *   ELASTICSEARCH_NODE=http://your-es-server:9200 npx ts-node src/scripts/setup-kibana-indices.ts
 */
import { loadEnv } from '@medusajs/framework/utils'

import { ensureKibanaIndexTemplates } from '../infrastructure/kibana-logger'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

async function main() {
  console.log('Creating Kibana index templates...')
  console.log(
    'ES node:',
    process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
  )

  await ensureKibanaIndexTemplates()

  console.log('Done. Three templates created:')
  console.log(
    '  doorfestival-app-logs-template       → index: doorfestival-app-logs'
  )
  console.log(
    '  doorfestival-external-calls-template → index: doorfestival-external-calls'
  )
  console.log(
    '  doorfestival-api-requests-template   → index: doorfestival-api-requests'
  )
  console.log('')
  console.log('Next steps in Kibana:')
  console.log('  1. Stack Management → Data Views → Create data view')
  console.log('  2. Create three data views with index patterns:')
  console.log('     - doorfestival-app-logs*')
  console.log('     - doorfestival-external-calls*')
  console.log('     - doorfestival-api-requests*')
  console.log('  3. Set @timestamp as the time field for each')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
