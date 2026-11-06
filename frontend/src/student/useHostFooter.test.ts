import { renderHook } from "@testing-library/react";
import { useHostFooter } from "./useHostFooter";

describe("useHostFooter", () => {
  const parent = { postMessage: jest.fn() } as unknown as Window;

  beforeEach(() => {
    (parent.postMessage as jest.Mock).mockClear();
    Object.defineProperty(window, "parent", { value: parent, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "parent", { value: window, configurable: true });
  });

  it("posts the action, runs it on the host click, and hands the footer back", () => {
    const run = jest.fn();
    const { rerender, unmount } = renderHook(({ enabled }) => useHostFooter({ label: "Submit", enabled, run }), {
      initialProps: { enabled: false },
    });
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      { type: "plugin.footerAction", payload: { label: "Submit", enabled: false } }, "*",
    );

    const click = () => window.dispatchEvent(
      new MessageEvent("message", { data: { type: "uber.footerActionClicked" }, source: parent }),
    );
    click();
    expect(run).not.toHaveBeenCalled();

    rerender({ enabled: true });
    click();
    expect(run).toHaveBeenCalledTimes(1);

    unmount();
    expect(parent.postMessage).toHaveBeenLastCalledWith({ type: "plugin.footerAction", payload: null }, "*");
  });
});
