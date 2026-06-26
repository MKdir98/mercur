import { useState, useRef } from 'react'
import { Button, Label, Text } from '@medusajs/ui'
import { mercurQuery } from '../../../lib/client'
import { resolveImageUrl } from '../../../utils'

interface ImageUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  label: string
}

export const ImageUploader = ({ value, onChange, label }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('files', file)

      const result = await mercurQuery('/admin/uploads', {
        method: 'POST',
        body: formData
      })

      const url = result.files?.[0]?.url
      if (url) {
        onChange(url)
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div>
      <Label size="small">{label}</Label>
      <div className="mt-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        {value ? (
          <div className="relative">
            <img
              src={resolveImageUrl(value) ?? undefined}
              alt={label}
              className="w-full h-32 object-cover rounded-md border"
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              Remove
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        )}
      </div>
    </div>
  )
}
