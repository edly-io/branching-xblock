import { useEffect, useRef, useState } from "react";

export interface HostFooterAction {
  label: string;
  enabled: boolean;
  run: () => void;
}

/** Origin of the page embedding this block, or null when it is not in an iframe. */
export function hostOrigin(): string | null {
  if (window.parent === window || !document.referrer) {
    return null;
  }
  try {
    return new URL(document.referrer).origin;
  } catch (e) {
    return null;
  }
}

/**
 * Hand the current step's main button (Submit, Back to scenario) to a host
 * page that shows its own sticky footer button, such as the Uber Learn app.
 *
 * Posts `plugin.footerAction` with `{ label, enabled }`, or a null payload to
 * give the footer back. The host answers `uber.footerActionAccepted`, and from
 * then on this returns true so the block hides its own copy of the button;
 * until then the block keeps it, so a host that missed the post leaves the
 * learner a way forward. `uber.footerActionClicked` runs the action.
 * Messages go to, and are only accepted from, the embedding page's origin.
 *
 * The messages carry no block id, so the host has one footer per unit:
 * content rule, at most one branching scenario per unit.
 */
export function useHostFooter(action: HostFooterAction | null): boolean {
  const [accepted, setAccepted] = useState(false);
  const runRef = useRef<(() => void) | null>(null);
  runRef.current = action && action.enabled ? action.run : null;

  const label = action ? action.label : null;
  const enabled = Boolean(action && action.enabled);

  useEffect(() => {
    const origin = hostOrigin();
    if (origin) {
      window.parent.postMessage(
        { type: "plugin.footerAction", payload: label ? { label, enabled } : null },
        origin,
      );
    }
  }, [label, enabled]);

  useEffect(() => {
    const origin = hostOrigin();
    if (!origin) {
      return undefined;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== origin) {
        return;
      }
      const type = (event.data as { type?: unknown } | null)?.type;
      if (type === "uber.footerActionAccepted") {
        setAccepted(true);
      } else if (type === "uber.footerActionClicked") {
        runRef.current?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return accepted;
}
