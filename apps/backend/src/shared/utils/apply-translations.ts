export function applyTranslations<T>(
  data: T,
  map: Record<string, string>,
  fields: string[]
): T {
  if (!map || Object.keys(map).length === 0) return data

  if (Array.isArray(data)) {
    return data.map((item) => applyTranslations(item, map, fields)) as T
  }

  if (data && typeof data === 'object') {
    const result = { ...data } as Record<string, unknown>

    for (const field of fields) {
      const val = result[field]
      if (typeof val === 'string' && map[val]) {
        result[field] = map[val]
      }
    }

    for (const key of Object.keys(result)) {
      const val = result[key]
      if (val && typeof val === 'object') {
        result[key] = applyTranslations(val, map, fields)
      }
    }

    return result as T
  }

  return data
}

export function shouldTranslate(locale: string | undefined): boolean {
  return locale === 'ir' || locale === 'fa' || locale === 'en'
}
