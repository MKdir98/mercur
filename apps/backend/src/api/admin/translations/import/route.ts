import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { TRANSLATIONS_MODULE } from '@mercurjs/translations'

function parseCsv(content: string): Array<[string, string]> {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  const rows: Array<[string, string]> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const matches = line.match(/("(?:[^"]|"")*"|[^,]*)/g)

    if (!matches || matches.length < 2) continue

    const en = matches[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim()
    const fa = matches[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim()

    if (i === 0 && (en.toLowerCase() === 'en' || en.toLowerCase() === 'source_text') && (fa.toLowerCase() === 'fa' || fa.toLowerCase() === 'translated_text')) {
      continue
    }

    if (en && fa) {
      rows.push([en, fa])
    }
  }

  return rows
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const input = (req as any).file

  if (!input) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'No file was uploaded for importing'
    )
  }

  const content = input.buffer.toString('utf-8')
  const rows = parseCsv(content)

  const translationsService = req.scope.resolve(TRANSLATIONS_MODULE)

  const created: Array<{ id: string; source_text: string; translated_text: string }> = []
  const updated: Array<{ id: string; source_text: string; translated_text: string }> = []

  for (const [source_text, translated_text] of rows) {
    const existing = await translationsService.listTranslations({
      filters: { source_text }
    })

    if (existing.length > 0) {
      const result = await translationsService.updateTranslations({
        id: existing[0].id,
        translated_text
      })
      const t = Array.isArray(result) ? result[0] : result
      if (t) updated.push(t)
    } else {
      const result = await translationsService.createTranslations({
        source_text,
        translated_text
      })
      const t = Array.isArray(result) ? result[0] : result
      if (t) created.push(t)
    }
  }

  res.status(201).json({
    created: created.length,
    updated: updated.length,
    total: rows.length,
    translations: [...created, ...updated]
  })
}
