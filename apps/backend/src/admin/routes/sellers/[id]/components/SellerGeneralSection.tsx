import { Button, Container, Divider, Heading, Text, toast, usePrompt } from "@medusajs/ui";
import { SellerStatusBadge } from "../../../../components/seller-status-badge/SellerStatusBagde";
import { ActionsButton } from "../../../../common/ActionsButton";
import { PencilSquare, User } from "@medusajs/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdateSeller } from "../../../../hooks/api/seller";
import { useEntityTranslations, useGenerateTranslation } from "../../../../hooks/api/translations";

const SELLER_FIELDS = [
  { field_name: "description", label: "Description" },
]

export const SellerGeneralSection = ({ seller }: { seller: any }) => {

  const navigate = useNavigate();
  const { mutateAsync: suspendSeller } = useUpdateSeller();
  const { mutateAsync: generate } = useGenerateTranslation();
  const { translations, refetch: refetchTranslations } = useEntityTranslations("seller", seller.id)
  const [loadingField, setLoadingField] = useState<string | null>(null)

  const translationByField = (field_name: string) =>
    translations?.find((t) => t.field_name === field_name)

  const handleTranslate = async (field_name: string) => {
    setLoadingField(field_name)
    try {
      await generate({ entity_type: "seller", entity_id: seller.id, field_name })
      toast.success(`Translation generated for ${field_name}`)
      refetchTranslations()
    } catch {
      toast.error(`Failed to generate translation for ${field_name}`)
    } finally {
      setLoadingField(null)
    }
  }

  const handleTranslateAll = async () => {
    setLoadingField("all")
    const results = await Promise.allSettled(
      SELLER_FIELDS.map(({ field_name }) =>
        generate({ entity_type: "seller", entity_id: seller.id, field_name })
      )
    )
    setLoadingField(null)
    refetchTranslations()
    const failed = results.filter((r) => r.status === "rejected").length
    if (failed === 0) toast.success("All seller translations generated")
    else toast.error(`${failed}/${results.length} translations failed`)
  }

  const dialog = usePrompt()
  
  const handleSuspend = async () => {
    const res = await dialog({
      title: seller.store_status === "SUSPENDED" ? "Activate account" : "Suspend account",
      description: seller.store_status === "SUSPENDED" ? "Are you sure you want to activate this account?" : "Are you sure you want to suspend this account?",
      verificationText: seller.email || seller.name || "",
    })

    if (!res) {
      return
    }

    if (seller.store_status === "SUSPENDED") {
      await suspendSeller({ id: seller.id, data: { store_status: "ACTIVE" } });
    } else {
      await suspendSeller({ id: seller.id, data: { store_status: "SUSPENDED" } });
    }
  }


  return (
    <>
      <div>
        <Container className="mb-2">
          <div className="flex items-center justify-between">
            <Heading>{seller.email || seller.name}</Heading>
            <div className="flex items-center gap-2">
              <SellerStatusBadge status={seller.store_status || 'pending'} />
              <ActionsButton
                actions={[
                  {
                    label: "Edit",
                    onClick: () => navigate(`/sellers/${seller.id}/edit`),
                    icon: <PencilSquare />
                  },
                  {
                    label: seller.store_status === "SUSPENDED" ? "Activate account" : "Suspend account",
                    onClick: () => handleSuspend(),
                    icon: <User />
                  }
                ]}
              />
            </div>
          </div>
        </Container>
      </div>
      <div className="flex gap-4">
        <Container className="px-0">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading>Store</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Name</Text>
              <Text className="w-1/2">{seller.name}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Email</Text>
              <Text className="w-1/2">{seller.email}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Phone</Text>
              <Text className="w-1/2">{seller.phone}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Description</Text>
              <Text className="w-1/2">{seller.description}</Text>
            </div>
          </div>
        </Container>
        <Container className="px-0">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading>Address</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Address</Text>
              <Text className="w-1/2">{seller.address_line}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Postal Code</Text>
              <Text className="w-1/2">{seller.postal_code}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">City</Text>
              <Text className="w-1/2">{seller.city}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">Country</Text>
              <Text className="w-1/2">{seller.country_code}</Text>
            </div>
            <Divider />
            <div className="px-8 py-4 flex">
              <Text className="font-medium text-ui-fg-subtle w-1/2">TaxID</Text>
              <Text className="w-1/2">{seller.tax_id}</Text>
            </div>
          </div>
        </Container>
      </div>
      <Container className="divide-y p-0 mt-4">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Translations</Heading>
        </div>
        {SELLER_FIELDS.map(({ field_name, label }) => {
          const t = translationByField(field_name)
          return (
            <div key={field_name} className="px-6 py-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Text className="font-medium">{label}</Text>
                <Button
                  variant="transparent"
                  size="small"
                  isLoading={loadingField === field_name}
                  disabled={loadingField !== null}
                  onClick={() => handleTranslate(field_name)}
                >
                  {t ? "Refresh" : "Generate"}
                </Button>
              </div>
              {t ? (
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-ui-fg-muted w-8 shrink-0">EN</span>
                    <span className="text-ui-fg-base break-words min-w-0">{t.source_text}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-ui-fg-muted w-8 shrink-0">FA</span>
                    <span className="text-ui-fg-base break-words min-w-0" dir="rtl">{t.translated_text}</span>
                  </div>
                </div>
              ) : (
                <Text size="small" className="text-ui-fg-muted">No translation yet</Text>
              )}
            </div>
          )
        })}
        <div className="px-6 py-4">
          <Button
            variant="secondary"
            size="small"
            isLoading={loadingField === "all"}
            disabled={loadingField !== null}
            onClick={handleTranslateAll}
          >
            Generate All
          </Button>
        </div>
      </Container>
    </>
  );
};