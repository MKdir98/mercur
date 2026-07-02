import { defineWidgetConfig } from "@medusajs/admin-sdk"

import {
  EntityTranslationsSection,
  TranslationField,
} from "../components/entity-translations/EntityTranslationsSection"

const FIELDS: TranslationField[] = [
  { field_name: "title", label: "Title" },
  { field_name: "description", label: "Description", multiline: true },
]

const ProductTranslationWidget = ({ data }: { data: { id: string } }) => {
  return <EntityTranslationsSection entityType="product" entityId={data.id} fields={FIELDS} />
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductTranslationWidget
