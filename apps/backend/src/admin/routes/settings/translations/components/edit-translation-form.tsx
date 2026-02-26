import { useState, useEffect } from "react";
import { Button, Input, Label, toast } from "@medusajs/ui";
import { useUpdateTranslation } from "../../../../hooks/api/translations";
import { Translation } from "../types";

type Props = {
  translation: Translation;
  onSuccess?: () => void;
};

const EditTranslationForm = ({ translation, onSuccess }: Props) => {
  const [sourceText, setSourceText] = useState(translation.source_text);
  const [translatedText, setTranslatedText] = useState(translation.translated_text);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSourceText(translation.source_text);
    setTranslatedText(translation.translated_text);
  }, [translation]);

  const { mutateAsync: updateTranslation } = useUpdateTranslation({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sourceText.trim() || !translatedText.trim()) {
      toast.error("Both fields are required");
      return;
    }
    setLoading(true);
    try {
      await updateTranslation({
        id: translation.id,
        source_text: sourceText.trim(),
        translated_text: translatedText.trim()
      });
      toast.success("Translation updated");
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
        <Label htmlFor="edit_source_text">English (source)</Label>
        <Input
          id="edit_source_text"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="edit_translated_text">Persian (translation)</Label>
        <Input
          id="edit_translated_text"
          value={translatedText}
          onChange={(e) => setTranslatedText(e.target.value)}
        />
      </div>
      <Button type="submit" isLoading={loading}>
        Update
      </Button>
    </form>
  );
};

export default EditTranslationForm;
