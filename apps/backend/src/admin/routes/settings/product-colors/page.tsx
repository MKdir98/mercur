import { defineRouteConfig } from '@medusajs/admin-sdk'
import { Button, Container, Heading, Input, Table, Text, toast } from '@medusajs/ui'
import { useEffect, useState } from 'react'

import {
  ProductColorDTO,
  useProductColors,
  useUpsertProductColor
} from '../../../hooks/api/product-colors'
import { SingleColumnLayout } from '../../../layouts/single-column'

const HEX_CODE_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const ColorSwatch = ({ hexCode }: { hexCode: string | null }) => {
  const isValid = !!hexCode && HEX_CODE_REGEX.test(hexCode)

  return (
    <div
      className="h-6 w-6 rounded border border-ui-border-base"
      style={{ backgroundColor: isValid ? hexCode! : 'transparent' }}
    />
  )
}

const ProductColorRow = ({ color }: { color: ProductColorDTO }) => {
  const [hexCode, setHexCode] = useState(color.hex_code ?? '')

  useEffect(() => {
    setHexCode(color.hex_code ?? '')
  }, [color.hex_code])

  const { mutateAsync: upsertProductColor, isPending } = useUpsertProductColor()

  const isValid = HEX_CODE_REGEX.test(hexCode)
  const isDirty = hexCode !== (color.hex_code ?? '')

  const handleSave = async () => {
    if (!isValid) {
      toast.error('Enter a valid hex color, e.g. #000000')
      return
    }

    try {
      await upsertProductColor({ value: color.value, hex_code: hexCode })
      toast.success(`Saved RGB for "${color.value}"`)
    } catch {
      toast.error(`Failed to save RGB for "${color.value}"`)
    }
  }

  return (
    <Table.Row>
      <Table.Cell>
        <div className="flex items-center gap-2">
          <ColorSwatch hexCode={isValid ? hexCode : null} />
          <Text>{color.value}</Text>
        </div>
      </Table.Cell>
      <Table.Cell>
        <Input
          value={hexCode}
          placeholder="#000000"
          onChange={(event) => setHexCode(event.target.value)}
          className="max-w-[160px]"
        />
      </Table.Cell>
      <Table.Cell>
        <Button
          variant="secondary"
          size="small"
          disabled={!isDirty || isPending}
          onClick={handleSave}
        >
          Save
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

const ProductColorsPage = () => {
  const { productColors, isLoading } = useProductColors()

  return (
    <SingleColumnLayout>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Product Colors</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Every color value used by a &quot;Color&quot; product option, across all
            products. Assign a hex/RGB code so the real color renders on the
            storefront instead of the plain color name.
          </Text>
        </div>
        <div className="flex size-full flex-col overflow-hidden">
          {isLoading && (
            <Text className="px-6 py-4">Loading...</Text>
          )}
          {!isLoading && !productColors?.length && (
            <Text className="px-6 py-4 text-ui-fg-subtle">
              No &quot;Color&quot; option values found yet.
            </Text>
          )}
          {!!productColors?.length && (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Color value</Table.HeaderCell>
                  <Table.HeaderCell>Hex / RGB code</Table.HeaderCell>
                  <Table.HeaderCell></Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {productColors.map((color) => (
                  <ProductColorRow key={color.value} color={color} />
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>
    </SingleColumnLayout>
  )
}

export const config = defineRouteConfig({
  label: 'Product Colors'
})

export default ProductColorsPage
