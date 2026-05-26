import { useState } from "react";
import { Button, Label, Textarea, toast } from "@medusajs/ui";
import { useCreateTranslation } from "../../../../hooks/api/translations";

type Props = {
  onSuccess?: () => void;
};

const CreateTranslationForm = ({ onSuccess }: Props) => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);

  const { mutateAsync: createTranslation } = useCreateTranslation({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sourceText.trim() || !translatedText.trim()) {
      toast.error("Both fields are required");
      return;
    }
    setLoading(true);
    try {
      await createTranslation({
        source_text: sourceText.trim(),
        translated_text: translatedText.trim()
      });
      toast.success("Translation added");
      setSourceText("");
      setTranslatedText("");
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="source_text">English (source)</Label>
        <Textarea
          id="source_text"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Product title, category name, or description"
          rows={4}
        />
      </div>
      <div>
        <Label htmlFor="translated_text">Persian (translation)</Label>
        <Textarea
          id="translated_text"
          value={translatedText}
          onChange={(e) => setTranslatedText(e.target.value)}
          placeholder="عنوان محصول، نام دسته یا توضیحات"
          rows={4}
        />
      </div>
      <Button type="submit" isLoading={loading}>
        Add
      </Button>
    </form>
  );
};

export default CreateTranslationForm;
