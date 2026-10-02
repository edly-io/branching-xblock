import { injectStyles, resetStyleCache, scopeRootSelectors } from "./shadowStyles";

function mockFetch(responses: Record<string, string>): jest.Mock {
  const fetchMock = jest.fn((url: string) => Promise.resolve(
    url in responses
      ? { ok: true, text: () => Promise.resolve(responses[url]) }
      : { ok: false, text: () => Promise.resolve("") },
  ));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function makeShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

describe("scopeRootSelectors", () => {
  it("rewrites :root to :host", () => {
    expect(scopeRootSelectors(":root{--a:1}")).toBe(":host{--a:1}");
  });

  it("rewrites every occurrence and leaves other selectors alone", () => {
    expect(scopeRootSelectors(":root{--a:1}.x{color:red}:root .y{--b:2}"))
      .toBe(":host{--a:1}.x{color:red}:host .y{--b:2}");
  });
});

describe("injectStyles", () => {
  beforeEach(() => {
    resetStyleCache();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects base css then each url as a scoped <style>, in order", async () => {
    mockFetch({ "/a.css": ":root{--a:1}", "/b.css": ".b{color:red}" });
    const shadowRoot = makeShadowRoot();

    await injectStyles(shadowRoot, ["/a.css", "/b.css"], ":host{display:block}");

    const styles = Array.from(shadowRoot.querySelectorAll("style"));
    expect(styles.map((s) => s.textContent)).toEqual([
      ":host{display:block}",
      ":host{--a:1}",
      ".b{color:red}",
    ]);
    expect(styles[1].getAttribute("data-bx-href")).toBe("/a.css");
    expect(document.head.children).toHaveLength(0);
  });

  it("falls back to a <link> in the shadow root when the fetch fails", async () => {
    mockFetch({});
    const shadowRoot = makeShadowRoot();

    const done = injectStyles(shadowRoot, ["/missing.css"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const link = shadowRoot.querySelector("link[rel='stylesheet']") as HTMLLinkElement;
    expect(link.getAttribute("href")).toBe("/missing.css");
    link.dispatchEvent(new Event("error"));

    await expect(done).resolves.toBeUndefined();
    expect(document.head.children).toHaveLength(0);
  });

  it("falls back to a <link> when fetch rejects", async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError("CORS"))) as unknown as typeof fetch;
    const shadowRoot = makeShadowRoot();

    const done = injectStyles(shadowRoot, ["/cors.css"]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const link = shadowRoot.querySelector("link[rel='stylesheet']") as HTMLLinkElement;
    link.dispatchEvent(new Event("load"));

    await expect(done).resolves.toBeUndefined();
  });

  it("fetches each URL once across shadow roots", async () => {
    const fetchMock = mockFetch({ "/a.css": ".a{}" });

    await injectStyles(makeShadowRoot(), ["/a.css"]);
    await injectStyles(makeShadowRoot(), ["/a.css"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
