/**
 * Normalizes Iranian phone numbers to a bare "98XXXXXXXXXX" form so grants
 * entered in the admin panel compare equal to `customer.phone`, regardless of
 * whether either side used +98, 0098, a leading 0, or the bare 10-digit form.
 */
export function normalizeIranPhone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }
  const digits = raw.replace(/[^0-9]/g, "")
  if (!digits) {
    return null
  }
  if (digits.startsWith("0098")) {
    return `98${digits.slice(4)}`
  }
  if (digits.startsWith("98") && digits.length === 12) {
    return digits
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `98${digits.slice(1)}`
  }
  if (digits.length === 10) {
    return `98${digits}`
  }
  return digits
}
