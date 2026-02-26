import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetTranslationsParamsType = z.infer<typeof AdminGetTranslationsParams>
export const AdminGetTranslationsParams = createFindParams({
  offset: 0,
  limit: 50
})

export type AdminCreateTranslationType = z.infer<typeof AdminCreateTranslation>
export const AdminCreateTranslation = z.object({
  source_text: z.string().min(1),
  translated_text: z.string().min(1)
})

export type AdminUpdateTranslationType = z.infer<typeof AdminUpdateTranslation>
export const AdminUpdateTranslation = z.object({
  source_text: z.string().min(1).optional(),
  translated_text: z.string().min(1).optional()
})
