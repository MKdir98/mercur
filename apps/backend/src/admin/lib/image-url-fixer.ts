/**
 * Patches <img> src attributes that point to localhost so they resolve against
 * the current window origin instead. Needed because the built-in Medusa admin
 * product list renders API-supplied URLs verbatim, and the local file provider
 * stores URLs with http://localhost:9000 as the host when BACKEND_URL is not
 * set to the public domain at upload time.
 */

let initialized = false

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function rewriteSrc(img: HTMLImageElement): void {
  const src = img.getAttribute("src")
  if (!src) return
  try {
    const u = new URL(src)
    if (isLocalHost(u.hostname)) {
      u.protocol = window.location.protocol
      u.host = window.location.host
      img.setAttribute("src", u.toString())
    }
  } catch {
    // not a fully-qualified URL — nothing to rewrite
  }
}

function fixAllImages(): void {
  document.querySelectorAll<HTMLImageElement>("img").forEach(rewriteSrc)
}

export function initImageUrlFixer(): void {
  if (typeof window === "undefined" || initialized) return
  initialized = true

  fixAllImages()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
        rewriteSrc(mutation.target)
        continue
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLImageElement) {
          rewriteSrc(node)
        } else if (node instanceof Element) {
          node.querySelectorAll<HTMLImageElement>("img").forEach(rewriteSrc)
        }
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  })
}
