import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Drawer,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import {
  useTranslations,
  useDeleteTranslation,
  useImportTranslations,
} from "../../../hooks/api/translations";
import { useState, useRef } from "react";
import CreateTranslationForm from "./components/create-translation-form";
import EditTranslationForm from "./components/edit-translation-form";

const CSV_SAMPLE = `en,fa
"Product A","محصول آ"
"Electronics","الکترونیک"
"Category Name","نام دسته"
`;

const TranslationsPage = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<{
    id: string;
    source_text: string;
    translated_text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { translations, isLoading, refetch } = useTranslations({});
  const { mutateAsync: deleteTranslation } = useDeleteTranslation({});
  const { mutateAsync: importTranslations, isPending: isImporting } =
    useImportTranslations({});

  const handleEdit = (t: { id: string; source_text: string; translated_text: string }) => {
    setEditingTranslation(t);
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this translation?")) return;
    try {
      await deleteTranslation(id);
      toast.success("Deleted");
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

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Translations (EN → FA)</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage English to Persian translations for product titles and
            category names
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
