import { defineRouteConfig } from '@medusajs/admin-sdk'
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast
} from '@medusajs/ui'
import { useEffect, useState } from 'react'

import {
  useUpdateStorePriceDisplay,
  type PriceDisplayUsdMetadata
} from '../../../hooks/api/price-display'
import { useStores } from '../../../hooks/api/stores'

const parseNumber = (raw: string): number | null => {
  const n = Number(String(raw).replace(/,/g, '').trim())
  if (Number.isNaN(n)) return null
  return n
}

const PriceDisplaySettingsPage = () => {
  const { stores, isLoading } = useStores()
  const store = stores?.[0]
  const updateMutation = useUpdateStorePriceDisplay()

  const metaPd = store?.metadata as Record<string, unknown> | undefined
  const existingPd = metaPd?.price_display_usd as
    | Partial<PriceDisplayUsdMetadata>
    | undefined

  const [tomanPerUsd, setTomanPerUsd] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('')

  useEffect(() => {
    if (!store) return
    if (typeof existingPd?.toman_per_usd === 'number') {
      setTomanPerUsd(String(existingPd.toman_per_usd))
    } else {
      setTomanPerUsd('')
    }
    if (typeof existingPd?.commission_percent === 'number') {
      setCommissionPercent(String(existingPd.commission_percent))
    } else {
      setCommissionPercent('')
    }
  }, [store?.id, existingPd?.toman_per_usd, existingPd?.commission_percent])

  const handleSave = async () => {
    if (!store?.id) {
      toast.error('Store not found')
      return
    }
    const rate = parseNumber(tomanPerUsd)
    if (rate === null || rate <= 0) {
      toast.error('Enter a valid Toman per USD rate (greater than zero)')
      return
    }
    const comm = parseNumber(commissionPercent)
    if (comm === null || comm < 0) {
      toast.error('Enter a valid commission percent (zero or greater)')
      return
    }
    try {
      await updateMutation.mutateAsync({
        storeId: store.id,
        existingMetadata:
          store.metadata && typeof store.metadata === 'object'
            ? (store.metadata as Record<string, unknown>)
            : {},
        priceDisplay: {
          toman_per_usd: rate,
          commission_percent: comm
        }
      })
      toast.success('Price display settings saved')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>USD price display</Heading>
        <Button
          size="small"
          variant="primary"
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="px-6 py-8 space-y-6 max-w-md">
        {isLoading ? (
          <Text>Loading...</Text>
        ) : !store ? (
          <Text>No store found</Text>
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Storefront uses these values when{' '}
              <code className="text-xs">NEXT_PUBLIC_DISPLAY_PRICES_IN_USD</code>{' '}
              is enabled. Formula: (Toman ÷ rate) × (1 + commission% ÷ 100).
              Product and cart amounts are converted from Rial; some order line
              totals use a different scale and are handled in the storefront.
            </Text>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="toman_per_usd">Toman per 1 USD</Label>
              <Input
                id="toman_per_usd"
                type="text"
                value={tomanPerUsd}
                onChange={(e) => setTomanPerUsd(e.target.value)}
                placeholder="e.g. 90000"
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="commission_percent">
                Display commission (%)
              </Label>
              <Input
                id="commission_percent"
                type="text"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'USD price display'
})

export default PriceDisplaySettingsPage
