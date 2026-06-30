export interface Translation {
  id: string
  source_text: string
  translated_text: string
  entity_type?: string | null
  entity_id?: string | null
  field_name?: string | null
}

export interface AdminCreateTranslation {
  source_text: string
  translated_text: string
}

export interface AdminUpdateTranslation {
  source_text?: string
  translated_text?: string
}
