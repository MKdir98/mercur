import { Badge, Button, Container, Heading, Label, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useState } from "react"

import {
  useCreateTranslation,
  useEntityTranslations,
  useGenerateTranslation,
  useUpdateTranslation,
} from "../../hooks/api/translations"

export type TranslationField = {
  field_name: string
  label: string
  multiline?: boolean
}

type Props = {
  entityType: string
  entityId: string
  fields: TranslationField[]
  className?: string
}

export const EntityTranslationsSection = ({ entityType, entityId, fields, className }: Props) => {
  const { mutateAsync: generate } = useGenerateTranslation()
  const { mutateAsync: update } = useUpdateTranslation()
  const { mutateAsync: create } = useCreateTranslation()
  const { translations, refetch } = useEntityTranslations(entityType, entityId)
  const prompt = usePrompt()
  const [loading, setLoading] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [sourceText, setSourceText] = useState("")
  const [translatedText, setTranslatedText] = useState("")

  const translationByField = (field_name: string) =>
    translations?.find((t) => t.field_name === field_name)

  const startEdit = (field_name: string) => {
    const t = translationByField(field_name)
    setSourceText(t?.source_text ?? "")
    setTranslatedText(t?.translated_text ?? "")
    setEditing(field_name)
  }

  const handleSave = async (field_name: string) => {
    if (!sourceText.trim() || !translatedText.trim()) {
      toast.error("Both fields are required")
      return
    }
    setLoading(field_name)
    try {
      const t = translationByField(field_name)
      if (t) {
        await update({
          id: t.id,
          source_text: sourceText.trim(),
          translated_text: translatedText.trim(),
        })
      } else {
        await create({
          source_text: sourceText.trim(),
          translated_text: translatedText.trim(),
          entity_type: entityType,
          entity_id: entityId,
          field_name,
        })
      }
      toast.success(`Translation saved for ${field_name}`)
      setEditing(null)
      refetch()
    } catch {
      toast.error(`Failed to save translation for ${field_name}`)
    } finally {
      setLoading(null)
    }
  }

  const handleGenerate = async (field_name: string) => {
    const t = translationByField(field_name)
    let force = false
    if (t?.manually_edited) {
      const confirmed = await prompt({
        title: "Overwrite manual edit?",
        description:
          "This translation was edited manually. Regenerating will replace it with an automatic translation.",
        confirmText: "Overwrite",
        cancelText: "Cancel",
      })
      if (!confirmed) return
      force = true
    }
    setLoading(field_name)
    try {
      const result = await generate({ entity_type: entityType, entity_id: entityId, field_name, force })
      if (result?.skipped) {
        toast.warning(`Translation for ${field_name} was edited manually and was not overwritten`)
      } else {
        toast.success(`Translation generated for ${field_name}`)
      }
      refetch()
    } catch {
      toast.error(`Failed to generate translation for ${field_name}`)
    } finally {
      setLoading(null)
    }
  }

  const handleGenerateAll = async () => {
    setLoading("all")
    const results = await Promise.allSettled(
      fields.map(({ field_name }) =>
        generate({ entity_type: entityType, entity_id: entityId, field_name })
      )
    )
    setLoading(null)
    refetch()
    const failed = results.filter((r) => r.status === "rejected")
    const skipped = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { skipped?: boolean })?.skipped
    )
    if (failed.length === results.length) {
      toast.error("Failed to generate translations")
    } else if (failed.length === 0 && skipped.length === 0) {
      toast.success("All translations generated")
    } else {
      const generated = results.length - failed.length - skipped.length
      toast.warning(
        `${generated}/${results.length} generated` +
          (skipped.length ? `, ${skipped.length} kept (manually edited)` : "")
      )
    }
  }

  return (
    <Container className={`divide-y p-0 ${className ?? ""}`}>
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Translations</Heading>
      </div>

      {fields.map(({ field_name, label, multiline }) => {
        const t = translationByField(field_name)
        const isEditing = editing === field_name
        return (
          <div key={field_name} className="px-6 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Text className="font-medium">{label}</Text>
                {t?.manually_edited && (
                  <Badge size="2xsmall" color="orange">
                    Edited manually
                  </Badge>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center">
                  <Button
                    variant="transparent"
                    size="small"
                    disabled={loading !== null || editing !== null}
                    onClick={() => startEdit(field_name)}
                  >
                    {t ? "Edit" : "Add"}
                  </Button>
                  <Button
                    variant="transparent"
                    size="small"
                    isLoading={loading === field_name}
                    disabled={loading !== null || editing !== null}
                    onClick={() => handleGenerate(field_name)}
                  >
                    {t ? "Refresh" : "Generate"}
                  </Button>
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${entityType}_${field_name}_source_text`} size="small">
                    English (source)
                  </Label>
                  <Textarea
                    id={`${entityType}_${field_name}_source_text`}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    rows={multiline ? 4 : 2}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${entityType}_${field_name}_translated_text`} size="small">
                    Persian (translation)
                  </Label>
                  <Textarea
                    id={`${entityType}_${field_name}_translated_text`}
                    value={translatedText}
                    onChange={(e) => setTranslatedText(e.target.value)}
                    rows={multiline ? 4 : 2}
                    dir="rtl"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={loading !== null}
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    isLoading={loading === field_name}
                    disabled={loading !== null}
                    onClick={() => handleSave(field_name)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : t ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-ui-fg-muted w-8 shrink-0">EN</span>
                  <span className="text-ui-fg-base break-words min-w-0">{t.source_text}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-ui-fg-muted w-8 shrink-0">FA</span>
                  <span className="text-ui-fg-base break-words min-w-0" dir="rtl">{t.translated_text}</span>
                </div>
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-muted">No translation yet</Text>
            )}
          </div>
        )
      })}

      <div className="px-6 py-4">
        <Button
          variant="secondary"
          size="small"
          isLoading={loading === "all"}
          disabled={loading !== null || editing !== null}
          onClick={handleGenerateAll}
        >
          Generate All
        </Button>
      </div>
    </Container>
  )
}
