// Maps a sequential display_id to a non-sequential order code using a bijective
// integer hash (Thomas Wang's hash). Different display_ids always produce different codes.
function scrambleDisplayId(n: number): number {
  n = (n ^ (n >>> 16)) >>> 0
  n = Math.imul(n, 0x45d9f3b) >>> 0
  n = (n ^ (n >>> 16)) >>> 0
  n = Math.imul(n, 0x45d9f3b) >>> 0
  n = (n ^ (n >>> 16)) >>> 0
  return n
}

export function orderCode(displayId: number): string {
  const scrambled = scrambleDisplayId(displayId)
  return `DF-${scrambled.toString(36).toUpperCase().padStart(7, '0')}`
}
