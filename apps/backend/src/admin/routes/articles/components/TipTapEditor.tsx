import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Button, Label } from '@medusajs/ui'
import { mercurQuery } from '../../../lib/client'

interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null

  const addImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('files', file)

      try {
        const result = await mercurQuery('/admin/uploads', {
          method: 'POST',
          body: formData
        })
        const url = result.files?.[0]?.url
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      } catch (error) {
        console.error('Failed to upload image:', error)
      }
    }
    input.click()
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-200' : ''}
      >
        B
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-gray-200' : ''}
      >
        I
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
      >
        H1
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
      >
        H2
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}
      >
        H3
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
      >
        List
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
      >
        OL
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={setLink}
        className={editor.isActive('link') ? 'bg-gray-200' : ''}
      >
        Link
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={addImage}
      >
        Image
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        ---
      </Button>
    </div>
  )
}

export const TipTapEditor = ({
  value,
  onChange,
  label,
  placeholder = 'Start writing...'
}: TipTapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value ? JSON.parse(value) : '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
  })

  return (
    <div>
      {label && <Label size="small" className="mb-1 block">{label}</Label>}
      <div className="border rounded-md overflow-hidden">
        <MenuBar editor={editor} />
        <EditorContent
          editor={editor}
          className="prose max-w-none p-4 min-h-[300px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[250px]"
        />
      </div>
    </div>
  )
}
