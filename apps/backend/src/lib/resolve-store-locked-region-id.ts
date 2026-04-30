import type { MedusaContainer } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { resolveRegionDatabaseId } from './resolve-region-database-id'
import { getStoreLockedRegionId } from './store-locked-region'

export async function resolveStoreLockedRegionIdOrThrow(
  container: MedusaContainer
): Promise<string | undefined> {
  const raw = getStoreLockedRegionId()
  if (!raw) {
    return undefined
  }
  const id = await resolveRegionDatabaseId(container, raw)
  if (!id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `STORE_LOCKED_REGION_ID is not a valid region id or name: ${raw}`
    )
  }
  return id
}
