import React from "react";
import { waitFor } from "@testing-library/react";
import { makeXBlockInitializer } from "./mountApp";
import { resetStyleCache } from "./shadowStyles";

const CORE = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/core.min.css";
const LIGHT = "https://cdn.jsdelivr.net/npm/@openedx/paragon@23/dist/light.min.css";
const OWN = "/static/own.css";

function Hello({ label }: { label: string }) {
  return <p data-testid="hello">{label}</p>;
}

const initialize = makeXBlockInitializer(Hello, (_runtime, _element, data) => ({
  label: (data as { label: string }).label,
}));
const runtime = { handlerUrl: () => "" };

function mockFetch(responses: Record<string, string>): void {
  global.fetch = jest.fn((url: string) => Promise.resolve(
    url in responses
      ? { ok: true, text: () => Promise.resolve(responses[url]) }
      : { ok: false, text: () => Promise.resolve("") },
  )) as unknown as typeof fetch;
}

function makeBlock(): { block: HTMLElement; host: HTMLElement } {
  const block = document.createElement("div");
  block.innerHTML = '<div data-react-root="true"></div>';
  document.body.appendChild(block);
  return { block, host: block.querySelector("[data-react-root]") as HTMLElement };
}

function inShadow(host: HTMLElement, selector: string): Element | null {
  return host.shadowRoot?.querySelector(selector) ?? null;
}

describe("makeXBlockInitializer", () => {
  beforeEach(() => {
    resetStyleCache();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.body.removeAttribute("data-bx-content-rev");
    mockFetch({ [CORE]: ":root{--core:1}html{font-size:10px}", [LIGHT]: ":root{--light:1}", [OWN]: ".own{}" });
  });

  it("renders the app inside the host's shadow root", async () => {
    const { block, host } = makeBlock();

    initialize(runtime, block, { label: "hi", style_urls: [OWN] });

    await waitFor(() => expect(inShadow(host, "[data-testid='hello']")).not.toBeNull());
    expect(block.querySelector("[data-testid='hello']")).toBeNull();
    expect(inShadow(host, ".bx-shadow-container [data-testid='hello']")).not.toBeNull();
  });

  it("adds nothing to document.head", async () => {
    const { block, host } = makeBlock();

    initialize(runtime, block, { label: "hi", style_urls: [OWN] });

    await waitFor(() => expect(inShadow(host, "[data-testid='hello']")).not.toBeNull());
    expect(document.head.children).toHaveLength(0);
  });

  it("injects host base css, then Paragon core, light and block css with :root scoped to :host", async () => {
    const { block, host } = makeBlock();

    initialize(runtime, block, { label: "hi", style_urls: [OWN] });

    await waitFor(() => expect(inShadow(host, "[data-testid='hello']")).not.toBeNull());
    const styles = Array.from(host.shadowRoot!.querySelectorAll("style"));
    expect(styles[0].textContent).toContain(":host{display:block");
    expect(styles.slice(1).map((s) => s.getAttribute("data-bx-href"))).toEqual([CORE, LIGHT, OWN]);
    expect(styles[1].textContent).toBe(":host{--core:1}html{font-size:10px}");
  });

  it("still renders when a stylesheet cannot be fetched", async () => {
    mockFetch({ [CORE]: "", [LIGHT]: "" });
    const { block, host } = makeBlock();

    initialize(runtime, block, { label: "hi", style_urls: [OWN] });

    await waitFor(() => expect(inShadow(host, `link[href='${OWN}']`)).not.toBeNull());
    host.shadowRoot!.querySelector(`link[href='${OWN}']`)!.dispatchEvent(new Event("error"));
    await waitFor(() => expect(inShadow(host, "[data-testid='hello']")).not.toBeNull());
  });

  it("asks the host to remeasure when the content resizes", async () => {
    const callbacks: ResizeObserverCallback[] = [];
    const original = global.ResizeObserver;
    global.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    const { block, host } = makeBlock();

    try {
      initialize(runtime, block, { label: "hi" });
      await waitFor(() => expect(inShadow(host, "[data-testid='hello']")).not.toBeNull());
      callbacks.forEach((callback) => callback([], {} as ResizeObserver));

      expect(document.body.getAttribute("data-bx-content-rev")).not.toBeNull();
    } finally {
      global.ResizeObserver = original;
    }
  });

  it("renders in the light DOM and links styles in document.head when isolateStyles is false", async () => {
    const initializeEditor = makeXBlockInitializer(
      Hello,
      (_runtime, _element, data) => ({ label: (data as { label: string }).label }),
      { isolateStyles: false },
    );
    const { block, host } = makeBlock();

    initializeEditor(runtime, block, { label: "hi", style_urls: [OWN] });

    await waitFor(() => expect(host.querySelector("[data-testid='hello']")).not.toBeNull());
    expect(host.shadowRoot).toBeNull();
    expect(Array.from(document.head.querySelectorAll("link[rel='stylesheet']")).map((l) => l.getAttribute("href")))
      .toEqual([CORE, LIGHT, OWN]);
  });
});
