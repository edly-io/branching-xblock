/**
 * Load stylesheets into a shadow root so they style only this block.
 *
 * Paragon's stylesheets are page-wide (reboot rules on html/body, utility
 * classes), so they must not land in document.head. Inside a shadow tree,
 * `:root` matches nothing, and Paragon declares its design tokens there, so
 * stylesheets are fetched as text with `:root` rewritten to `:host`. If a
 * fetch fails (e.g. a theme URL without CORS headers), the URL is loaded
 * through a <link> inside the shadow root instead: its rules still apply,
 * only its `:root` tokens are lost.
 */
const ROOT_SELECTOR = /:root(?![\w-])/g;

const cssTextCache = new Map<string, Promise<string | null>>();

export function scopeRootSelectors(cssText: string): string {
  return cssText.replace(ROOT_SELECTOR, ":host");
}

export function resetStyleCache(): void {
  cssTextCache.clear();
}

function fetchScopedCss(url: string): Promise<string | null> {
  let pending = cssTextCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => (text === null ? null : scopeRootSelectors(text)))
      .catch(() => null);
    cssTextCache.set(url, pending);
  }
  return pending;
}

function appendStyle(shadowRoot: ShadowRoot, cssText: string, href?: string): void {
  const style = document.createElement("style");
  if (href) {
    style.setAttribute("data-bx-href", href);
  }
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

function appendLink(shadowRoot: ShadowRoot, href: string): Promise<void> {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  const settled = new Promise<void>((resolve) => {
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => resolve());
  });
  shadowRoot.appendChild(link);
  return settled;
}

export async function injectStyles(shadowRoot: ShadowRoot, urls: string[], baseCss?: string): Promise<void> {
  const cssTexts = await Promise.all(urls.map(fetchScopedCss));

  if (baseCss) {
    appendStyle(shadowRoot, baseCss);
  }

  const pendingLinks: Promise<void>[] = [];
  urls.forEach((url, index) => {
    const cssText = cssTexts[index];
    if (cssText === null) {
      pendingLinks.push(appendLink(shadowRoot, url));
    } else {
      appendStyle(shadowRoot, cssText, url);
    }
  });
  await Promise.all(pendingLinks);
}
