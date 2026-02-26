import { MedusaService } from "@medusajs/framework/utils";

import { Translation } from "./models";

class TranslationsModuleService extends MedusaService({
  Translation,
}) {
  async getMapForLocale(locale: string): Promise<Record<string, string>> {
    if (locale !== "ir" && locale !== "fa") {
      return {};
    }
    const translations = await this.listTranslations({});
    return (translations || []).reduce(
      (acc: Record<string, string>, t: { source_text: string; translated_text: string }) => {
        if (t.source_text && t.translated_text) {
          acc[t.source_text] = t.translated_text;
        }
        return acc;
      },
      {}
    );
  }
}

export default TranslationsModuleService;
