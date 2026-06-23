import { Label, Select } from '@medusajs/ui'
import { useArticleCategories } from '../../../hooks/api/article-categories'

interface CategorySelectProps {
  value: string[]
  onChange: (value: string[]) => void
}

export const CategorySelect = ({ value, onChange }: CategorySelectProps) => {
  const { categories = [] } = useArticleCategories({ limit: 100 })

  const handleToggle = (categoryId: string) => {
    if (value.includes(categoryId)) {
      onChange(value.filter((id) => id !== categoryId))
    } else {
      onChange([...value, categoryId])
    }
  }

  return (
    <div>
      <Label size="small">Categories</Label>
      <div className="mt-1 flex flex-wrap gap-2">
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex items-center gap-1 text-sm"
          >
            <input
              type="checkbox"
              checked={value.includes(category.id)}
              onChange={() => handleToggle(category.id)}
              className="rounded"
            />
            {category.name}
          </label>
        ))}
      </div>
    </div>
  )
}
