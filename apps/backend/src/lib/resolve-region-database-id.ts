import type { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export async function resolveRegionDatabaseId(
  container: MedusaContainer,
  ref: string
): Promise<string | null> {
  const q = ref.trim()
  if (!q) {
    return null
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: byId } = await query.graph({
    entity: 'region',
    fields: ['id'],
    filters: { id: q },
  })
  if (byId?.[0]?.id) {
    return byId[0].id as string
  }

  const { data: byExactName } = await query.graph({
    entity: 'region',
    fields: ['id', 'name'],
    filters: { name: q },
  })
  if (byExactName?.[0]?.id) {
    return byExactName[0].id as string
  }

  const { data: all } = await query.graph({
    entity: 'region',
    fields: ['id', 'name'],
  })
  const needle = q.toLowerCase()
  const row = (all || []).find(
    (r: { id?: string; name?: string }) =>
      r?.name?.trim().toLowerCase() === needle
  )
  return (row?.id as string) ?? null
}
