import { z } from "zod";

export const AdminUpdateHomepageMediaItem = z.object({
  key: z.string(),
  image_url: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
});

export const AdminUpdateHomepageMediaBody = z.object({
  items: z.array(AdminUpdateHomepageMediaItem),
});

export type AdminUpdateHomepageMediaBodyType = z.infer<
  typeof AdminUpdateHomepageMediaBody
>;
