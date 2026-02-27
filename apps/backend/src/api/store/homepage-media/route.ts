import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

import {
  HOMEPAGE_MEDIA_MODULE,
  HomepageMediaModuleService,
} from "@mercurjs/homepage-media";
import { TRANSLATIONS_MODULE, TranslationsModuleService } from "@mercurjs/translations";

import { applyTranslations, shouldTranslate } from "../../../shared/utils/apply-translations";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(
    HOMEPAGE_MEDIA_MODULE
  ) as HomepageMediaModuleService;

  let itemsByKey = await service.getItemsByKey();

  const locale = req.headers['x-locale'] as string | undefined
  if (locale && shouldTranslate(locale) && Object.keys(itemsByKey).length > 0) {
    const translationsService = req.scope.resolve(TRANSLATIONS_MODULE) as TranslationsModuleService
    const translationMap = await translationsService.getMapForLocale(locale)
    itemsByKey = applyTranslations(itemsByKey, translationMap, ['label', 'alt']) as typeof itemsByKey
  }

  res.json({ homepage_media: itemsByKey });
};
