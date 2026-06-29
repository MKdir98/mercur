import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { initImageUrlFixer } from "../lib/image-url-fixer"

const ImageUrlFixerWidget = () => {
  useEffect(() => {
    initImageUrlFixer()
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ImageUrlFixerWidget
