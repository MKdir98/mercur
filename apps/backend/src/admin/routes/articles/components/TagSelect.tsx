import { useState } from 'react'
import { Label, Select, Button, Badge } from '@medusajs/ui'
import { useArticleTags } from '../../../hooks/api/article-tags'
import { X } from '@medusajs/icons'

interface TagSelectProps {
  value: string[]
  onChange: (value: string[]) => void
}

export const TagSelect = ({ value, onChange }: TagSelectProps) => {
  const { tags = [] } = useArticleTags({ limit: 100 })

  const selectedTags = tags.filter((t) => value.includes(t.id))
  const availableTags = tags.filter((t) => !value.includes(t.id))

  const handleAdd = (tagId: string) => {
    onChange([...value, tagId])
  }

  const handleRemove = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId))
  }

  return (
    <div>
      <Label size="small">Tags</Label>
      <div className="mt-1 flex flex-wrap gap-1 mb-2">
        {selectedTags.map((tag) => (
          <Badge key={tag.id} className="flex items-center gap-1">
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              className="ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      {availableTags.length > 0 && (
        <Select value="" onValueChange={handleAdd}>
          <Select.Trigger>
            <Select.Value placeholder="Add tag..." />
          </Select.Trigger>
          <Select.Content>
            {availableTags.map((tag) => (
              <Select.Item key={tag.id} value={tag.id}>
                {tag.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      )}
    </div>
  )
}
