import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"

import { SingleColumnLayout } from "../../../layouts/single-column"
import { FEATURE_MODULE_NAMES } from "../../../lib/feature-module-names"
import {
  useFeatureAccess,
  useGrantFeatureAccess,
  useRevokeFeatureAccess,
} from "../../../hooks/api/feature-access"

const FeatureAccessPage = () => {
  const [moduleName, setModuleName] = useState<string>(FEATURE_MODULE_NAMES[0])
  const [phone, setPhone] = useState("")

  const { storeId, metadata, featureAccess, isLoading } = useFeatureAccess()
  const { mutateAsync: grantAccess, isPending: isGranting } = useGrantFeatureAccess()
  const { mutateAsync: revokeAccess, isPending: isRevoking } = useRevokeFeatureAccess()

  const phones = featureAccess[moduleName] ?? []

  const handleGrant = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!storeId) return
    if (!phone.trim()) {
      toast.error("Enter a phone number")
      return
    }
    try {
      await grantAccess({
        storeId,
        metadata,
        module_name: moduleName,
        phones,
        phone: phone.trim(),
      })
      toast.success(`Granted access to ${phone.trim()}`)
      setPhone("")
    } catch {
      toast.error("Failed to grant access")
    }
  }

  const handleRevoke = async (p: string) => {
    if (!storeId) return
    try {
      await revokeAccess({ storeId, metadata, module_name: moduleName, phones, phone: p })
      toast.success(`Revoked access for ${p}`)
    } catch {
      toast.error(`Failed to revoke access for ${p}`)
    }
  }

  return (
    <SingleColumnLayout>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Feature Access</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Grant a phone number early access to a soft-launched module.
          </Text>
        </div>

        <form onSubmit={handleGrant} className="flex items-end gap-2 px-6 py-4">
          <div className="w-48">
            <Text size="small" weight="plus" className="mb-1 block">
              Module
            </Text>
            <Select value={moduleName} onValueChange={setModuleName}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {FEATURE_MODULE_NAMES.map((name) => (
                  <Select.Item key={name} value={name}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="flex-1">
            <Text size="small" weight="plus" className="mb-1 block">
              Phone number
            </Text>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="09121234567"
            />
          </div>
          <Button type="submit" disabled={isGranting || !storeId}>
            Grant access
          </Button>
        </form>

        <div className="px-6 py-4">
          {isLoading && <Text>Loading...</Text>}
          {!isLoading && !phones.length && (
            <Text className="text-ui-fg-subtle" size="small">
              No one has been granted access to "{moduleName}" yet.
            </Text>
          )}
          {!isLoading && !!phones.length && (
            <div className="flex flex-wrap gap-2">
              {phones.map((p) => (
                <Badge key={p} className="flex items-center gap-1.5 py-1 pl-2.5 pr-1">
                  <Text size="small">+{p}</Text>
                  <IconButton
                    size="small"
                    variant="transparent"
                    disabled={isRevoking}
                    onClick={() => handleRevoke(p)}
                  >
                    <Trash />
                  </IconButton>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Container>
    </SingleColumnLayout>
  )
}

export const config = defineRouteConfig({
  label: "Feature Access",
})

export default FeatureAccessPage
