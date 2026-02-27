import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import { mercurQuery } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-keys-factory";

export interface HomepageMediaItem {
  id: string;
  key: string;
  label: string;
  type: string;
  image_url: string | null;
  video_url: string | null;
  link: string | null;
  alt: string | null;
}

export const homepageMediaQueryKeys = queryKeysFactory("homepage_media");

export const useHomepageMedia = (
  options?: Omit<
    UseQueryOptions<unknown, Error, { homepage_media: HomepageMediaItem[] }, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: homepageMediaQueryKeys.list({}),
    queryFn: () =>
      mercurQuery("/admin/homepage-media", {
        method: "GET",
      }),
    ...options,
  });

  return { ...data, ...other };
};

export const useUpdateHomepageMedia = (
  options?: UseMutationOptions<
    { homepage_media: HomepageMediaItem[] },
    Error,
    { items: Array<{ key: string; image_url?: string | null; video_url?: string | null; link?: string | null; alt?: string | null }> }
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      mercurQuery("/admin/homepage-media", {
        method: "PUT",
        body: payload,
      }),
    ...options,
  });
};
