import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Select,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

import { SingleColumnLayout } from "../../../layouts/single-column"
import {
  useCreateFeatureGrant,
  useDeleteFeatureGrant,
  useFeatureGrants,
  useFeatureModules,
  useUpsertFeatureModule,
  type FeatureModule,
} from "../../../hooks/api/feature-access"

const ModuleRow = ({ featureModule }: { featureModule: FeatureModule }) => {
  const { mutateAsync: upsertFeatureModule, isPending } = useUpsertFeatureModule()

  const handleToggle = async (isGated: boolean) => {
    try {
      await upsertFeatureModule({
        module_name: featureModule.module_name,
        is_gated: isGated,
      })
      toast.success(
        isGated
          ? `"${featureModule.module_name}" is now soft-launched (hidden unless granted)`
          : `"${featureModule.module_name}" is now visible to everyone`
      )
    } catch {
      toast.error(`Failed to update "${featureModule.module_name}"`)
    }
  }

  return (
    <Table.Row>
      <Table.Cell>
        <Text weight="plus">{featureModule.module_name}</Text>
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center gap-2">
          <Switch
            checked={featureModule.is_gated}
            disabled={isPending}
            onCheckedChange={handleToggle}
          />
          <Text size="small" className="text-ui-fg-subtle">
            {featureModule.is_gated ? "Gated (soft-launch)" : "Public"}
          </Text>
        </div>
      </Table.Cell>
    </Table.Row>
  )
}

const AddModuleForm = () => {
  const [moduleName, setModuleName] = useState("")
  const { mutateAsync: upsertFeatureModule, isPending } = useUpsertFeatureModule()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = moduleName.trim()
    if (!trimmed) {
      toast.error("Enter a module name")
      return
    }
    try {
      await upsertFeatureModule({ module_name: trimmed, is_gated: true })
      toast.success(`"${trimmed}" added — hidden until you grant access`)
      setModuleName("")
    } catch {
      toast.error(`Failed to add "${trimmed}"`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-6 py-4">
      <div className="flex-1">
        <Text size="small" weight="plus" className="mb-1 block">
          Module name
        </Text>
        <Input
          value={moduleName}
          onChange={(event) => setModuleName(event.target.value)}
          placeholder="e.g. remitation"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        Add module
      </Button>
    </form>
  )
}

const GrantRow = ({
  grantId,
  phone,
  createdAt,
  moduleName,
}: {
  grantId: string
  phone: string
  createdAt: string
  moduleName: string
}) => {
  const { mutateAsync: deleteFeatureGrant, isPending } = useDeleteFeatureGrant()

  const handleDelete = async () => {
    try {
      await deleteFeatureGrant({ id: grantId, module_name: moduleName })
      toast.success("Access revoked")
    } catch {
      toast.error("Failed to revoke access")
    }
  }

  return (
    <Table.Row>
      <Table.Cell>
        <Text>+{phone}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text className="text-ui-fg-subtle" size="small">
          {new Date(createdAt).toLocaleString()}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <IconButton
          size="small"
          variant="transparent"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Trash />
        </IconButton>
      </Table.Cell>
    </Table.Row>
  )
}

const GrantsSection = ({ featureModules }: { featureModules: FeatureModule[] }) => {
  const [selectedModule, setSelectedModule] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (!selectedModule && featureModules.length) {
      setSelectedModule(featureModules[0].module_name)
    }
  }, [featureModules, selectedModule])

  const { grants, isLoading } = useFeatureGrants(selectedModule)
  const { mutateAsync: createFeatureGrant, isPending } = useCreateFeatureGrant()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedModule) {
      toast.error("Add a module first")
      return
    }
    if (!phone.trim()) {
      toast.error("Enter a phone number")
      return
    }
    try {
      await createFeatureGrant({ module_name: selectedModule, phone: phone.trim() })
      toast.success(`Granted access to ${phone.trim()}`)
      setPhone("")
    } catch {
      toast.error("Failed to grant access")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Access Grants</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Phone numbers listed here can see a gated module even while it's soft-launched.
        </Text>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-6 py-4">
        <div className="w-48">
          <Text size="small" weight="plus" className="mb-1 block">
            Module
          </Text>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <Select.Trigger>
              <Select.Value placeholder="Select module" />
            </Select.Trigger>
            <Select.Content>
              {featureModules.map((m) => (
                <Select.Item key={m.module_name} value={m.module_name}>
                  {m.module_name}
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
        <Button type="submit" disabled={isPending || !selectedModule}>
          Grant access
        </Button>
      </form>

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text className="px-6 py-4">Loading...</Text>}
        {!isLoading && !grants.length && (
          <Text className="px-6 py-4 text-ui-fg-subtle">
            No one has been granted access to this module yet.
          </Text>
        )}
        {!!grants.length && (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Phone</Table.HeaderCell>
                <Table.HeaderCell>Granted at</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {grants.map((grant) => (
                <GrantRow
                  key={grant.id}
                  grantId={grant.id}
                  phone={grant.phone}
                  createdAt={grant.created_at}
                  moduleName={selectedModule}
                />
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

const FeatureAccessPage = () => {
  const { featureModules, isLoading } = useFeatureModules()

  return (
    <SingleColumnLayout>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Feature Access</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Soft-launch a module by name, then grant specific phone numbers early access.
            Turn a module's gate off once it's ready for everyone.
          </Text>
        </div>
        <div className="flex size-full flex-col overflow-hidden">
          {isLoading && <Text className="px-6 py-4">Loading...</Text>}
          {!isLoading && !featureModules.length && (
            <Text className="px-6 py-4 text-ui-fg-subtle">
              No modules registered yet — add one below.
            </Text>
          )}
          {!!featureModules.length && (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Module</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {featureModules.map((m) => (
                  <ModuleRow key={m.module_name} featureModule={m} />
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
        <AddModuleForm />
      </Container>

      <GrantsSection featureModules={featureModules} />
    </SingleColumnLayout>
  )
}

export const config = defineRouteConfig({
  label: "Feature Access",
})

export default FeatureAccessPage
