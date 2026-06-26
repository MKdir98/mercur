import { MedusaService } from "@medusajs/framework/utils";

import { HomepageMediaItem } from "./models";

type HomepageMediaItemShape = {
  key: string;
  label: string;
  type: string;
  image_url: string | null;
  video_url: string | null;
  link: string | null;
  alt: string | null;
  product_ids: string[] | null;
};

class HomepageMediaModuleService extends MedusaService({
  HomepageMediaItem,
}) {
  async getItemsByKey(): Promise<Record<string, HomepageMediaItemShape>> {
    const items = await this.listHomepageMediaItems({});
    return (items || []).reduce(
      (acc: Record<string, HomepageMediaItemShape>, item: any) => {
        if (item.key) {
          acc[item.key] = {
            key: item.key,
            label: item.label || "",
            type: item.type || "image",
            image_url: item.image_url ?? null,
            video_url: item.video_url ?? null,
            link: item.link ?? null,
            alt: item.alt ?? null,
            product_ids: item.product_ids ? JSON.parse(item.product_ids) : null,
          };
        }
        return acc;
      },
      {}
    );
  }
}

export default HomepageMediaModuleService;
