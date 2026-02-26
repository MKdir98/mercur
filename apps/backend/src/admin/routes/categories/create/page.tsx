import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowDownTray } from "@medusajs/icons"
import {
  FocusModal,
  Heading,
  Button,
  toast,
  Input,
  Label,
  Text,
  Textarea,
  Select,
  clx,
} from "@medusajs/ui"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useProductCategories } from "../../../hooks/api/product_category"
import { productCategoryQueryKeys } from "../../../hooks/api/product_category"
import { useQueryClient } from "@tanstack/react-query"
import { mercurQuery } from "../../../lib/client"
import { useState, useMemo, useRef } from "react"

const ACCEPT_IMAGE = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml"

const CreateCategoryPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const parentCategoryIdFromUrl = searchParams.get("parent_category_id")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { product_categories, isLoading } = useProductCategories()
  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(
    parentCategoryIdFromUrl || null
  )
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const NONE = "__none__"
  const categoryOptions = useMemo(() => {
    const list = (product_categories ?? []) as { id: string; name: string }[]
    return [
      { value: NONE, label: "None (top-level)" },
      ...list.map((c) => ({ value: c.id, label: c.name })),
    ]
  }, [product_categories])

  const handleClose = () => navigate(-1)

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview)
    }
    if (file) {
      setThumbnailFile(file)
      setThumbnailPreview(URL.createObjectURL(file))
    } else {
      setThumbnailFile(null)
      setThumbnailPreview(null)
    }
  }

  const clearThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview)
    }
    setThumbnailFile(null)
    setThumbnailPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadThumbnail = async (): Promise<string | undefined> => {
    if (!thumbnailFile) return undefined
    const bearer =
      (typeof window !== "undefined" && window.localStorage.getItem("medusa_auth_token")) || ""
    const formData = new FormData()
    formData.append("files", thumbnailFile)
    const res = await fetch("/admin/uploads", {
      method: "POST",
      credentials: "include",
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      body: formData,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.message || "Upload failed")
    }
    const data = await res.json()
    return data.files?.[0]?.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    setIsSubmitting(true)
    try {
      let thumbnailUrl: string | undefined
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail()
      }
      await mercurQuery("/admin/product-categories", {
        method: "POST",
        body: {
          name: name.trim(),
          ...(handle.trim() && { handle: handle.trim() }),
          ...(description.trim() && { description: description.trim() }),
          ...(parentCategoryId && { parent_category_id: parentCategoryId }),
          ...(thumbnailUrl && {
            metadata: { thumbnail: thumbnailUrl },
          }),
        },
      })
      queryClient.invalidateQueries({
        queryKey: productCategoryQueryKeys.lists(),
      })
      toast.success("Category created")
      navigate("/categories")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FocusModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading>
            {parentCategoryIdFromUrl ? "Create subcategory" : "Create category"}
          </Heading>
        </FocusModal.Header>
        <form id="create-category-form" onSubmit={handleSubmit}>
          <FocusModal.Body className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="handle">Handle (optional)</Label>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="url-handle"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="parent">Parent category</Label>
              <Select
                value={parentCategoryId ?? NONE}
                onValueChange={(v) =>
                  setParentCategoryId(v === NONE ? null : v)
                }
                disabled={isLoading}
              >
                <Select.Trigger id="parent">
                  <Select.Value placeholder="Select parent" />
                </Select.Trigger>
                <Select.Content>
                  {categoryOptions.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
              <input
                ref={fileInputRef}
                id="thumbnail"
                type="file"
                accept={ACCEPT_IMAGE}
                className="hidden"
                onChange={handleThumbnailChange}
              />
              {thumbnailPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={clearThumbnail}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={clx(
                    "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-6",
                    "border-ui-border-strong bg-ui-bg-component",
                    "hover:border-ui-border-interactive focus:border-ui-border-interactive focus:outline-none"
                  )}
                >
                  <ArrowDownTray className="text-ui-fg-subtle" />
                  <Text size="small" className="text-ui-fg-subtle">
                    Upload image (one file)
                  </Text>
                </button>
              )}
            </div>
          </FocusModal.Body>
        </form>
        <FocusModal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-category-form"
            disabled={isSubmitting}
          >
            Create
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({})

export default CreateCategoryPage
