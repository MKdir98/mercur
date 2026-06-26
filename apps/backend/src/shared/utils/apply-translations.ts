export function applyTranslations<T>(
  data: T,
  map: Record<string, string>,
  fields: string[]
): T {
  if (!map || Object.keys(map).length === 0) return data

  const lowerMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) {
    lowerMap[k.toLowerCase()] = v
  }

  return applyTranslationsWithMap(data, lowerMap, fields)
}

function applyTranslationsWithMap<T>(
  data: T,
  lowerMap: Record<string, string>,
  fields: string[]
): T {
  if (Array.isArray(data)) {
    return data.map((item) => applyTranslationsWithMap(item, lowerMap, fields)) as T
  }

  if (data && typeof data === 'object') {
    const result = { ...data } as Record<string, unknown>

    for (const field of fields) {
      const val = result[field]
      if (typeof val === 'string') {
        const translated = lowerMap[val.toLowerCase()]
        if (translated) {
          result[field] = translated
        }
      }
    }

    for (const key of Object.keys(result)) {
      const val = result[key]
      if (val && typeof val === 'object') {
        result[key] = applyTranslationsWithMap(val, lowerMap, fields)
      }
    }

    return result as T
  }

  return data
}

export function shouldTranslate(locale: string | undefined): boolean {
  return locale === 'ir' || locale === 'fa' || locale === 'en'
}
