import { useEffect, useRef } from "react";

export interface HostFooterAction {
  label: string;
  enabled: boolean;
  run: () => void;
}

/**
 * Hand the current step's main button (Submit, Back to scenario) to a host
 * page that shows its own sticky footer button, such as the Uber Learn app.
 *
 * Posts `plugin.footerAction` with `{ label, enabled }`, or a null payload to
 * give the footer back, and runs the action when the host posts
 * `uber.footerActionClicked`. A no-op when the block is not in an iframe.
 */
export function useHostFooter(action: HostFooterAction | null): void {
  const runRef = useRef<(() => void) | null>(null);
  runRef.current = action && action.enabled ? action.run : null;

  const label = action ? action.label : null;
  const enabled = Boolean(action && action.enabled);

  useEffect(() => {
    if (window.parent === window) {
      return undefined;
    }
    window.parent.postMessage(
      { type: "plugin.footerAction", payload: label ? { label, enabled } : null },
      "*",
    );
    return undefined;
  }, [label, enabled]);

  useEffect(() => {
    if (window.parent === window) {
      return undefined;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      if ((event.data as { type?: unknown } | null)?.type === "uber.footerActionClicked") {
        runRef.current?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.parent.postMessage({ type: "plugin.footerAction", payload: null }, "*");
    };
  }, []);
}
