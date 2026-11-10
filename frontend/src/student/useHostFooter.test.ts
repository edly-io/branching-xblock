import { renderHook } from "@testing-library/react";
import { HOST, frameIn, hostSays, unframe } from "../test/hostFrame";
import { useHostFooter } from "./useHostFooter";

describe("useHostFooter", () => {
  let parent: Window;

  beforeEach(() => {
    parent = frameIn();
  });

  afterEach(unframe);

  it("posts the action to the host origin and runs it on the host click", () => {
    const run = jest.fn();
    const { rerender } = renderHook(({ enabled }) => useHostFooter({ label: "Submit", enabled, run }), {
      initialProps: { enabled: false },
    });
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      { type: "plugin.footerAction", payload: { label: "Submit", enabled: false } }, HOST,
    );

    hostSays(parent, "uber.footerActionClicked");
    expect(run).not.toHaveBeenCalled();

    rerender({ enabled: true });
    hostSays(parent, "uber.footerActionClicked");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reports the host's acknowledgement", () => {
    const { result } = renderHook(() => useHostFooter({ label: "Submit", enabled: true, run: jest.fn() }));
    expect(result.current).toBe(false);

    hostSays(parent, "uber.footerActionAccepted");
    expect(result.current).toBe(true);
  });

  it("ignores messages from another origin or another window", () => {
    const run = jest.fn();
    const { result } = renderHook(() => useHostFooter({ label: "Submit", enabled: true, run }));

    hostSays(parent, "uber.footerActionClicked", "https://evil.example.com");
    hostSays(parent, "uber.footerActionAccepted", "https://evil.example.com");
    hostSays(window, "uber.footerActionClicked");

    expect(run).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("does nothing outside an iframe", () => {
    unframe();
    const run = jest.fn();
    renderHook(() => useHostFooter({ label: "Submit", enabled: true, run }));
    hostSays(window, "uber.footerActionClicked", "");
    expect(run).not.toHaveBeenCalled();
  });
});
