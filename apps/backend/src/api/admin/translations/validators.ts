import { z } from 'zod'

import { createFindParams } from '@medusajs/medusa/api/utils/validators'

export type AdminGetTranslationsParamsType = z.infer<typeof AdminGetTranslationsParams>
export const AdminGetTranslationsParams = createFindParams({
  offset: 0,
  limit: 50
})

const EntityType = z.enum(['product', 'seller', 'category'])

const VALID_FIELDS: Record<string, string[]> = {
  product: ['title', 'description'],
  seller: ['description'],
  category: ['name'],
}

const entityLinkageFields = {
  entity_type: EntityType.optional(),
  entity_id: z.string().min(1).optional(),
  field_name: z.string().min(1).optional(),
}

export type AdminCreateTranslationType = z.infer<typeof AdminCreateTranslation>
export const AdminCreateTranslation = z.object({
  source_text: z.string().min(1),
  translated_text: z.string().min(1),
  ...entityLinkageFields,
}).refine(
  (data) => {
    if (!data.entity_type && !data.entity_id && !data.field_name) return true
    if (data.entity_type && data.entity_id && data.field_name) {
      return VALID_FIELDS[data.entity_type]?.includes(data.field_name) ?? false
    }
    return false
  },
  { message: 'entity_type, entity_id, and field_name must all be provided together, with a valid field_name for the entity_type' }
)

export type AdminUpdateTranslationType = z.infer<typeof AdminUpdateTranslation>
export const AdminUpdateTranslation = z.object({
  source_text: z.string().min(1).optional(),
  translated_text: z.string().min(1).optional(),
})

export type AdminGenerateTranslationType = z.infer<typeof AdminGenerateTranslation>
export const AdminGenerateTranslation = z.object({
  entity_type: EntityType,
  entity_id: z.string().min(1),
  field_name: z.string().min(1),
}).refine(
  (data) => VALID_FIELDS[data.entity_type]?.includes(data.field_name) ?? false,
  { message: 'Invalid field_name for the given entity_type' }
)
