export interface Translation {
  id: string
  source_text: string
  translated_text: string
}

export interface AdminCreateTranslation {
  source_text: string
  translated_text: string
}

export interface AdminUpdateTranslation {
  source_text?: string
  translated_text?: string
}
