import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Folder } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useProductCategories } from "../../hooks/api/product_category"
import { useTranslations, useGenerateTranslation } from "../../hooks/api/translations"

type CategoryRow = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

const buildCategoryRows = (
  categories: CategoryRow[],
  parentId: string | null = null,
  level = 0
): { category: CategoryRow; level: number }[] => {
  return categories
    .filter((c) => (c.parent_category_id ?? null) === parentId)
    .flatMap((cat) => [
      { category: cat, level },
      ...buildCategoryRows(categories, cat.id, level + 1),
    ])
}

const CategoriesPage = () => {
  const { product_categories, isLoading, isError, error } = useProductCategories()
  const { mutateAsync: generate } = useGenerateTranslation()
  const { translations: categoryTranslations, refetch: refetchTranslations } = useTranslations({
    entity_type: "category",
    field_name: "name",
    limit: 1000,
  })
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const translationByEntityId = (entity_id: string) =>
    (categoryTranslations as any[])?.find((t: any) => t.entity_id === entity_id)

  const handleTranslate = async (id: string, name: string) => {
    setLoadingId(id)
    try {
      await generate({ entity_type: "category", entity_id: id, field_name: "name" })
      toast.success(`Translation generated for "${name}"`)
      refetchTranslations()
    } catch {
      toast.error(`Failed to generate translation for "${name}"`)
    } finally {
      setLoadingId(null)
    }
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Categories</Heading>
        </div>
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Loading...</Text>
        </div>
      </Container>
    )
  }

  if (isError) {
    toast.error(error?.message ?? "Failed to load categories")
    return null
  }

  const list = (product_categories ?? []) as CategoryRow[]
  const rows = buildCategoryRows(list)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Categories</Heading>
        <Button size="small" variant="secondary" asChild>
          <Link to="/categories/create">Create category</Link>
        </Button>
      </div>
      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name (EN)</Table.HeaderCell>
              <Table.HeaderCell>Translation (FA)</Table.HeaderCell>
              <Table.HeaderCell>Handle</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map(({ category, level }) => {
              const t = translationByEntityId(category.id)
              return (
                <Table.Row key={category.id}>
                  <Table.Cell>
                    <span style={{ paddingLeft: level * 16 }}>{category.name}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {t ? (
                      <span dir="rtl" className="text-ui-fg-base">{t.translated_text}</span>
                    ) : (
                      <span className="text-ui-fg-muted text-sm">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-muted">
                      /{category.handle}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Button size="small" variant="transparent" asChild>
                        <Link to={`/categories/${category.id}/edit`}>Edit</Link>
                      </Button>
                      <Button size="small" variant="transparent" asChild>
                        <Link to={`/categories/create?parent_category_id=${category.id}`}>
                          Add subcategory
                        </Link>
                      </Button>
                      <Button
                        size="small"
                        variant="transparent"
                        isLoading={loadingId === category.id}
                        disabled={loadingId !== null}
                        onClick={() => handleTranslate(category.id, category.name)}
                      >
                        {t ? "Refresh" : "Translate"}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
        {rows.length === 0 && (
          <Text size="small" className="text-ui-fg-muted py-4">
            No categories yet. Create one to get started.
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Categories",
  icon: Folder,
})

export const handle = {
  breadcrumb: () => "Categories",
}

export default CategoriesPage
