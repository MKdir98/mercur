import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

import { useEntityTranslations, useGenerateTranslation } from "../hooks/api/translations"

const FIELDS = [
  { field_name: "title", label: "Title" },
  { field_name: "description", label: "Description" },
]

const ProductTranslationWidget = ({ data }: { data: { id: string } }) => {
  const { mutateAsync: generate } = useGenerateTranslation()
  const { translations, refetch } = useEntityTranslations("product", data.id)
  const [loading, setLoading] = useState<string | null>(null)

  const translationByField = (field_name: string) =>
    translations?.find((t) => t.field_name === field_name)

  const handleGenerate = async (field_name: string) => {
    setLoading(field_name)
    try {
      await generate({ entity_type: "product", entity_id: data.id, field_name })
      toast.success(`Translation generated for ${field_name}`)
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
      FIELDS.map(({ field_name }) =>
        generate({ entity_type: "product", entity_id: data.id, field_name })
      )
    )
    setLoading(null)
    refetch()
    const failed = results.filter((r) => r.status === "rejected")
    if (failed.length === 0) {
      toast.success("All translations generated")
    } else if (failed.length === results.length) {
      toast.error("Failed to generate translations")
    } else {
      toast.warning(`${results.length - failed.length}/${results.length} translations generated`)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Translations</Heading>
      </div>

      {FIELDS.map(({ field_name, label }) => {
        const t = translationByField(field_name)
        return (
          <div key={field_name} className="px-6 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Text className="font-medium">{label}</Text>
              <Button
                variant="transparent"
                size="small"
                isLoading={loading === field_name}
                disabled={loading !== null}
                onClick={() => handleGenerate(field_name)}
              >
                {t ? "Refresh" : "Generate"}
              </Button>
            </div>
            {t ? (
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
          disabled={loading !== null}
          onClick={handleGenerateAll}
        >
          Generate All
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductTranslationWidget
