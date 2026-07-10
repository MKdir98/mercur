import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import {
  useTranslations,
  useDeleteTranslation,
  useImportTranslations,
  useGenerateTranslation,
} from "../../../hooks/api/translations";
import { useState, useRef } from "react";
import CreateTranslationForm from "./components/create-translation-form";
import EditTranslationForm from "./components/edit-translation-form";
import { Drawer } from "@medusajs/ui";
import { mercurQuery } from "../../../lib/client";

const CSV_SAMPLE = `en,fa
"Product A","محصول آ"
"Electronics","الکترونیک"
"Category Name","نام دسته"
"We are a premium fashion brand","ما یک برند مد ممتاز هستیم"
"High quality products for everyone","محصولات با کیفیت بالا برای همه"
`;

type BackfillProgress = {
  done: number
  total: number
  failed: number
} | null

const PAGE_SIZE = 50;

const TranslationsPage = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<{
    id: string;
    source_text: string;
    translated_text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress>(null)
  const [backfillRunning, setBackfillRunning] = useState(false)

  const { translations, count, isLoading, refetch } = useTranslations({
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE,
  });
  const { mutateAsync: deleteTranslation } = useDeleteTranslation({});
  const { mutateAsync: importTranslations, isPending: isImporting } =
    useImportTranslations({});
  const { mutateAsync: generate } = useGenerateTranslation()

  const handleEdit = (t: { id: string; source_text: string; translated_text: string }) => {
    setEditingTranslation(t);
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this translation?")) return;
    try {
      await deleteTranslation(id);
      toast.success("Deleted");
      if (translations?.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
      refetch();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importTranslations(file);
      toast.success(
        `Imported: ${result.created} created, ${result.updated} updated`
      );
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
    e.target.value = "";
  };

  const downloadSample = () => {
    const blob = new Blob([CSV_SAMPLE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translations-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const backfillCategories = async () => {
    let offset = 0
    const limit = 100
    let total = 0
    let cats: { id: string; name: string }[] = []

    try {
      const first: any = await mercurQuery('/admin/product-categories', { method: 'GET', query: { limit, offset, fields: 'id,name' } })
      total = first.count ?? 0
      cats = first.product_categories ?? []
      while (cats.length < total) {
        offset += limit
        const page: any = await mercurQuery('/admin/product-categories', { method: 'GET', query: { limit, offset, fields: 'id,name' } })
        cats = [...cats, ...(page.product_categories ?? [])]
      }
    } catch {
      toast.error("Failed to fetch categories")
      return
    }

    if (!cats.length) { toast.warning("No categories found"); return }
    if (!confirm(`Generate translations for ${cats.length} categories?`)) return

    setBackfillRunning(true)
    setBackfillProgress({ done: 0, total: cats.length, failed: 0 })

    let failed = 0
    for (const cat of cats) {
      try {
        await generate({ entity_type: "category", entity_id: cat.id, field_name: "name" })
      } catch {
        failed++
      }
      setBackfillProgress((p) => p ? { ...p, done: p.done + 1, failed } : null)
    }

    setBackfillRunning(false)
    toast.success(`Categories: ${cats.length - failed} translated, ${failed} failed`)
    refetch()
  }

  const backfillSellers = async () => {
    if (!confirm("Generate translations for all existing sellers? Continue?")) return

    setBackfillRunning(true)

    let allSellers: { id: string }[] = []
    try {
      let offset = 0
      const limit = 100
      const first: any = await mercurQuery('/admin/sellers', { method: 'GET', query: { limit, offset, fields: 'id' } })
      const total = first.count ?? 0
      allSellers = first.sellers ?? []
      while (allSellers.length < total) {
        offset += limit
        const page: any = await mercurQuery('/admin/sellers', { method: 'GET', query: { limit, offset, fields: 'id' } })
        allSellers = [...allSellers, ...(page.sellers ?? [])]
      }
    } catch {
      toast.error("Failed to fetch sellers")
      setBackfillRunning(false)
      return
    }

    const taskTotal = allSellers.length
    setBackfillProgress({ done: 0, total: taskTotal, failed: 0 })

    let failed = 0
    for (const seller of allSellers) {
      for (const field_name of ["description"]) {
        try {
          await generate({ entity_type: "seller", entity_id: seller.id, field_name })
        } catch {
          failed++
        }
        setBackfillProgress((p) => p ? { ...p, done: p.done + 1, failed } : null)
      }
    }

    setBackfillRunning(false)
    toast.success(`Sellers: ${taskTotal - failed} translations generated, ${failed} failed`)
    refetch()
  }

  const backfillProducts = async () => {
    if (!confirm("This will generate translations for all existing products. Continue?")) return

    setBackfillRunning(true)

    // Fetch all products (paginated, 100 per page)
    let offset = 0
    const limit = 100
    let total = 0
    let allProducts: { id: string }[] = []

    try {
      const first: any = await mercurQuery('/admin/products', { method: 'GET', query: { limit, offset, fields: 'id' } })
      total = first.count ?? 0
      allProducts = first.products ?? []
      while (allProducts.length < total) {
        offset += limit
        const page: any = await mercurQuery('/admin/products', { method: 'GET', query: { limit, offset, fields: 'id' } })
        allProducts = [...allProducts, ...(page.products ?? [])]
      }
    } catch {
      toast.error("Failed to fetch products")
      setBackfillRunning(false)
      return
    }

    const taskTotal = allProducts.length * 2 // title + description
    setBackfillProgress({ done: 0, total: taskTotal, failed: 0 })

    let failed = 0
    for (const product of allProducts) {
      for (const field_name of ["title", "description"]) {
        try {
          await generate({ entity_type: "product", entity_id: product.id, field_name })
        } catch {
          failed++
        }
        setBackfillProgress((p) => p ? { ...p, done: p.done + 1, failed } : null)
      }
    }

    setBackfillRunning(false)
    toast.success(`Products: ${taskTotal - failed} translations generated, ${failed} failed`)
    refetch()
  }

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Translations (EN → FA)</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage English to Persian translations for product titles, descriptions,
            category names, and brand descriptions
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadSample}>
            Download CSV sample
          </Button>
          <Button
            variant="secondary"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import from file"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Drawer open={createOpen} onOpenChange={setCreateOpen}>
            <Drawer.Trigger asChild>
              <Button onClick={() => setCreateOpen(true)}>Add translation</Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Add translation</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <CreateTranslationForm
                  onSuccess={() => {
                    setCreateOpen(false);
                    refetch();
                  }}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        </div>
      </div>

      {/* Bulk backfill */}
      <div className="flex items-center gap-3 border-t px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle mr-2">Backfill existing:</Text>
        <Button
          size="small"
          variant="secondary"
          isLoading={backfillRunning}
          disabled={backfillRunning}
          onClick={backfillCategories}
        >
          All categories
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={backfillRunning}
          disabled={backfillRunning}
          onClick={backfillProducts}
        >
          All products
        </Button>
        <Button
          size="small"
          variant="secondary"
          isLoading={backfillRunning}
          disabled={backfillRunning}
          onClick={backfillSellers}
        >
          All sellers
        </Button>
        {backfillProgress && (
          <Text size="small" className="text-ui-fg-subtle">
            {backfillProgress.done}/{backfillProgress.total}
            {backfillProgress.failed > 0 && ` (${backfillProgress.failed} failed)`}
          </Text>
        )}
      </div>

      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text>Loading...</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>English</Table.HeaderCell>
              <Table.HeaderCell>Persian</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {translations?.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell>{t.source_text}</Table.Cell>
                <Table.Cell>{t.translated_text}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleEdit(t)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleDelete(t.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <Table.Pagination
          className="w-full"
          canNextPage={PAGE_SIZE * (currentPage + 1) < (count || 0)}
          canPreviousPage={currentPage > 0}
          previousPage={() => setCurrentPage(currentPage - 1)}
          nextPage={() => setCurrentPage(currentPage + 1)}
          count={count || 0}
          pageCount={Math.ceil((count || 0) / PAGE_SIZE)}
          pageIndex={currentPage}
          pageSize={PAGE_SIZE}
        />
      </div>
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit translation</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            {editingTranslation && (
              <EditTranslationForm
                translation={editingTranslation}
                onSuccess={() => {
                  setEditOpen(false);
                  setEditingTranslation(null);
                  refetch();
                }}
              />
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Translations",
});

export default TranslationsPage;
