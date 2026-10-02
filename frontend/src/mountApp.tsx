import React from "react";
import { createRoot } from "react-dom/client";
import { SharedIntlProvider } from "./i18n";
import { injectStyles } from "./shadowStyles";
import { notifyHostRemeasure } from "./notifyHostRemeasure";

export type XBlockElementLike = Element | { 0?: Element; length?: number; jquery?: string };

export interface XBlockRuntime {
  handlerUrl(element: XBlockElementLike | null, handlerName: string, suffix?: string, query?: string): string;
  notify?(name: string, payload?: Record<string, unknown>): void;
}

interface ThemeUrls {
  core?: {
    urls?: {
      default?: string;
      brandOverride?: string;
    };
  };
  default?: {
    light?: string;
    [key: string]: string | undefined;
  };
  variants?: {
    [key: string]: {
      urls?: {
        brandOverride?: string;
      };
    };
  };
}

export interface XBlockPayloadBase {
  mfe_config_api?: string;
  style_urls?: string[];
}

const PARAGON_CORE_CSS = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/core.min.css";
const PARAGON_LIGHT_CSS = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/light.min.css";

function toDomElement(element: XBlockElementLike): Element {
  if (element instanceof Element) {
    return element;
  }

  if (element && element[0] instanceof Element) {
    return element[0];
  }

  throw new Error("XBlock initializer received an unsupported root element.");
}

async function getParagonStyles(mfeConfigApi?: string): Promise<string[]> {
  if (!mfeConfigApi) {
    return [PARAGON_CORE_CSS, PARAGON_LIGHT_CSS];
  }

  try {
    const response = await fetch(mfeConfigApi);
    const mfeConfig = await response.json();
    const themeUrls = mfeConfig.PARAGON_THEME_URLS as ThemeUrls | undefined;
    const variant = themeUrls?.default?.light;
    return [
      themeUrls?.core?.urls?.default || PARAGON_CORE_CSS,
      themeUrls?.core?.urls?.brandOverride,
      PARAGON_LIGHT_CSS,
      variant ? themeUrls?.variants?.[variant]?.urls?.brandOverride : undefined,
    ].filter(Boolean) as string[];
  } catch (error) {
    // Keep Studio usable if the host platform does not expose the MFE config API.
    return [PARAGON_CORE_CSS, PARAGON_LIGHT_CSS];
  }
}

// Paragon's reboot styles `body`, which doesn't exist inside the shadow tree;
// apply the same base typography to the host so the block looks as before.
const SHADOW_BASE_CSS = [
  ":host{display:block;font-family:var(--pgn-typography-font-family-base);",
  "font-size:var(--pgn-typography-font-size-base);font-weight:var(--pgn-typography-font-weight-base);",
  "line-height:var(--pgn-typography-line-height-base);color:var(--pgn-color-body-base);text-align:left}",
  ".bx-shadow-container{display:flex;flex-direction:column;flex-grow:1;min-height:100%}",
].join("");

async function getStyleUrls(data: unknown): Promise<string[]> {
  const payload = (data || {}) as XBlockPayloadBase;
  const paragonStyleUrls = await getParagonStyles(payload.mfe_config_api);
  return [...paragonStyleUrls, ...(payload.style_urls || [])];
}

function appendStylesheet(url: string): void {
  if (document.head.querySelector(`link[href="${url}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

// The Studio preview iframe resizes on DOM mutations, which it can't see
// inside a shadow tree, so report size changes ourselves.
function observeContentSize(container: Element): void {
  if (typeof ResizeObserver === "undefined") {
    return;
  }
  new ResizeObserver(() => notifyHostRemeasure()).observe(container);
}

export interface MountOptions {
  /**
   * Render inside a shadow root with the stylesheets scoped to it (default).
   * The Studio editor opts out: it runs on its own page, and its form controls
   * are meant to pick up Studio's modal-editor styles.
   */
  isolateStyles?: boolean;
}

function renderApp(container: Element, app: React.ReactElement): void {
  createRoot(container).render(
    React.createElement(
      SharedIntlProvider,
      null,
      app,
    ),
  );
}

export function makeXBlockInitializer<P>(
  AppComponent: React.ComponentType<P>,
  propsFactory: (runtime: XBlockRuntime, element: XBlockElementLike, data: unknown) => P,
  options: MountOptions = {},
) {
  return function initializer(runtime: XBlockRuntime, element: XBlockElementLike, data: unknown): void {
    const el = toDomElement(element);
    const host = el.querySelector('[data-react-root="true"]') || el;
    const props = propsFactory(runtime, element, data);
    const app = React.createElement(AppComponent as React.ComponentType<any>, props as any);

    if (options.isolateStyles === false) {
      void getStyleUrls(data)
        .then((urls) => urls.forEach(appendStylesheet))
        .finally(() => renderApp(host, app));
      return;
    }

    const shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
    void getStyleUrls(data)
      .then((urls) => injectStyles(shadowRoot, urls, SHADOW_BASE_CSS))
      .finally(() => {
        const container = document.createElement("div");
        container.className = "bx-shadow-container";
        // Paragon's RTL rules key off `[dir=rtl]` on an ancestor, and <html>
        // is outside the shadow tree.
        const dir = document.documentElement.dir || document.body.dir;
        if (dir) {
          container.dir = dir;
        }
        shadowRoot.appendChild(container);
        observeContentSize(container);
        renderApp(container, app);
      });
  };
}
