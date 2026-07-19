/**
 * Deletes documents older than KIBANA_LOG_RETENTION_DAYS (default 4) from the
 * three doorfestival logging indices. Meant to run on a schedule (cron), not
 * on every deploy — these indices grow forever otherwise since they're not
 * date-rotated.
 *
 * Usage:
 *   cd apps/backend
 *   KIBANA_ES_NODE=http://your-es-server:9200 \
 *   KIBANA_LOG_RETENTION_DAYS=4 \
 *   npx ts-node src/scripts/prune-kibana-logs.ts
 *
 * Run this from a host that has the mercur repo checked out with deps
 * installed (same convention as setup-kibana-indices.ts) — not from inside
 * the backend's production container, which only ships compiled output.
 * The ES port is published to 127.0.0.1:9200 by doocker/docker-compose.yml,
 * so from the production server itself: KIBANA_ES_NODE=http://localhost:9200
 *
 * Cron example (daily at 03:00, keep last 4 days):
 *   0 3 * * * cd /path/to/mercur/apps/backend && KIBANA_ES_NODE=http://localhost:9200 KIBANA_LOG_RETENTION_DAYS=4 npx ts-node src/scripts/prune-kibana-logs.ts >> /var/log/prune-kibana-logs.log 2>&1
 */
import { loadEnv } from '@medusajs/framework/utils'

import { pruneOldLogs } from '../infrastructure/kibana-logger'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

async function main() {
  const retentionDays = Number(process.env.KIBANA_LOG_RETENTION_DAYS) || 4
  console.log(`Pruning logs older than ${retentionDays} days...`)
  console.log('ES node:', process.env.KIBANA_ES_NODE || 'http://localhost:9200')

  await pruneOldLogs(retentionDays)

  console.log('Done.')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
