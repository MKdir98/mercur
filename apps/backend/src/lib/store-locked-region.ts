export function getStoreLockedRegionId(): string | undefined {
  const v = process.env.STORE_LOCKED_REGION_ID?.trim()
  return v || undefined
}
