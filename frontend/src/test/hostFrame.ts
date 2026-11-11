import { act } from "@testing-library/react";

export const HOST = "https://learn.example.com";

/** Pretend to be framed by HOST; returns the parent whose postMessage is a mock. */
export function frameIn(origin = HOST): Window {
  const parent = { postMessage: jest.fn() } as unknown as Window;
  Object.defineProperty(window, "parent", { value: parent, configurable: true });
  Object.defineProperty(document, "referrer", { value: `${origin}/activity/1`, configurable: true });
  return parent;
}

export function unframe(): void {
  Object.defineProperty(window, "parent", { value: window, configurable: true });
  Object.defineProperty(document, "referrer", { value: "", configurable: true });
}

export function hostSays(parent: Window, type: string, origin = HOST): void {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type }, source: parent, origin }));
  });
}
