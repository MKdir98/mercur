import { MedusaService } from "@medusajs/framework/utils";

import { Translation } from "./models";

const MAP_CACHE_TTL_MS = 5 * 60 * 1000;

class TranslationsModuleService extends MedusaService({
  Translation,
}) {
  private mapCache = new Map<string, { map: Record<string, string>; expiresAt: number }>();

  async getMapForLocale(locale: string): Promise<Record<string, string>> {
    if (locale !== "ir" && locale !== "fa" && locale !== "en") {
      return {};
    }

    const cached = this.mapCache.get(locale);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.map;
    }

    const translations = await this.listTranslations({});
    const map = (translations || []).reduce(
      (acc: Record<string, string>, t: { source_text: string; translated_text: string }) => {
        if (t.source_text && t.translated_text) {
          if (locale === "en") {
            acc[t.translated_text.toLowerCase()] = t.source_text;
          } else {
            acc[t.source_text.toLowerCase()] = t.translated_text;
          }
        }
        return acc;
      },
      {}
    );

    this.mapCache.set(locale, { map, expiresAt: Date.now() + MAP_CACHE_TTL_MS });
    return map;
  }

  /** Call after any create/update/delete on translations so stale maps aren't served until TTL expiry. */
  invalidateCache(): void {
    this.mapCache.clear();
  }
}

export default TranslationsModuleService;
