/**
 * Rewrites absolute URLs saved with a local backend host to the current window
 * origin. This is needed because the local file-upload module stores URLs with
 * `http://localhost:9000/static/...` which breaks when the admin panel is served
 * from a different origin in production.
 *
 * Blob URLs (e.g. object URLs created from File objects) are returned unchanged.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (typeof window === "undefined") return url;
  if (url.startsWith("blob:")) return url;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
      if (localHosts.has(parsed.hostname)) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}
