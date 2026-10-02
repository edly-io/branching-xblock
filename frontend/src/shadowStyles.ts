/**
 * Load stylesheets into a shadow root so they style only this block.
 *
 * Paragon's stylesheets are page-wide (reboot rules on html/body, utility
 * classes), so they must not land in document.head. Inside a shadow tree,
 * `:root` matches nothing, and Paragon declares its design tokens there, so
 * stylesheets are fetched as text with `:root` rewritten to `:host`. Relative
 * URLs are resolved against the stylesheet (an inline <style> would resolve
 * them against the page), and `@font-face` rules are hoisted to document.head
 * because browsers don't reliably load fonts declared inside a shadow root.
 * If a fetch fails or stalls (e.g. a theme URL without CORS headers), the URL
 * is loaded through a <link> inside the shadow root instead: its rules still
 * apply, only its `:root` tokens are lost.
 */
const ROOT_SELECTOR = /:root(?![\w-])/g;
const CSS_URL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/g;
const CSS_IMPORT_STRING = /@import\s+(['"])([^'"]+)\1/g;
const FONT_FACE_RULE = /@font-face\s*\{[^}]*\}/g;
const NON_RELATIVE_URL = /^(?:$|#|[a-z][a-z\d+.-]*:)/i;

// Long enough for a slow CDN, short enough that a stalled request doesn't
// leave the block blank until the browser gives up on it.
export const STYLE_TIMEOUT_MS = 8000;

const cssTextCache = new Map<string, Promise<string | null>>();

export function scopeRootSelectors(cssText: string): string {
  return cssText.replace(ROOT_SELECTOR, ":host");
}

function resolveUrls(cssText: string, stylesheetUrl: string): string {
  const base = new URL(stylesheetUrl, document.baseURI).href;
  const resolve = (url: string) => (NON_RELATIVE_URL.test(url) ? url : new URL(url, base).href);
  return cssText
    .replace(CSS_URL, (_match, quote: string, url: string) => `url(${quote}${resolve(url)}${quote})`)
    .replace(CSS_IMPORT_STRING, (_match, quote: string, url: string) => `@import ${quote}${resolve(url)}${quote}`);
}

function hoistFontFaces(cssText: string, stylesheetUrl: string): string {
  const fontFaces = cssText.match(FONT_FACE_RULE);
  if (!fontFaces) {
    return cssText;
  }
  const style = document.createElement("style");
  style.setAttribute("data-bx-font-faces", stylesheetUrl);
  style.textContent = fontFaces.join("\n");
  document.head.appendChild(style);
  return cssText.replace(FONT_FACE_RULE, "");
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), STYLE_TIMEOUT_MS);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}

export function resetStyleCache(): void {
  cssTextCache.clear();
}

function fetchScopedCss(url: string): Promise<string | null> {
  let pending = cssTextCache.get(url);
  if (!pending) {
    // Runs once per URL per page, so fonts are hoisted only once.
    pending = withTimeout(fetch(url).then((response) => (response.ok ? response.text() : null)), null)
      .then((text) => (text === null ? null : hoistFontFaces(scopeRootSelectors(resolveUrls(text, url)), url)))
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
  console.warn(`BranchingXBlock: could not fetch ${href}; loading it with <link>, so its :root design tokens won't apply.`);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  const settled = new Promise<void>((resolve) => {
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => resolve());
  });
  shadowRoot.appendChild(link);
  return withTimeout(settled, undefined);
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
