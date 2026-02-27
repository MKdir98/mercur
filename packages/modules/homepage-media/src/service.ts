import { MedusaService } from "@medusajs/framework/utils";

import { HomepageMediaItem } from "./models";

class HomepageMediaModuleService extends MedusaService({
  HomepageMediaItem,
}) {
  async getItemsByKey(): Promise<Record<string, { key: string; label: string; type: string; image_url: string | null; video_url: string | null; link: string | null; alt: string | null }>> {
    const items = await this.listHomepageMediaItems({});
    return (items || []).reduce(
      (
        acc: Record<string, { key: string; label: string; type: string; image_url: string | null; video_url: string | null; link: string | null; alt: string | null }>,
        item: { key: string; label: string; type: string; image_url?: string | null; video_url?: string | null; link?: string | null; alt?: string | null }
      ) => {
        if (item.key) {
          acc[item.key] = {
            key: item.key,
            label: item.label || "",
            type: item.type || "image",
            image_url: item.image_url ?? null,
            video_url: item.video_url ?? null,
            link: item.link ?? null,
            alt: item.alt ?? null,
          };
        }
        return acc;
      },
      {}
    );
  }
}

export default HomepageMediaModuleService;
