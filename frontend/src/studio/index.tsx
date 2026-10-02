import { makeXBlockInitializer, XBlockRuntime, XBlockElementLike } from "../mountApp";
import { StudioPayload, StudioHandlerUrls, StudioInitialState, StudioMeta } from "../apiTypes";
import StudioApp from "./StudioApp";

interface StudioAppProps {
  handlerUrls: StudioHandlerUrls;
  initial_state: StudioInitialState;
  meta: StudioMeta;
  runtime: XBlockRuntime;
}

function propsFactory(runtime: XBlockRuntime, _element: XBlockElementLike, data: unknown): StudioAppProps {
  const payload = data as StudioPayload;
  const handlerUrls: StudioHandlerUrls = {
    studio_submit: payload.handler_urls?.studio_submit
      || runtime.handlerUrl(_element, "studio_submit"),
    export_nodes: payload.handler_urls?.export_nodes
      || runtime.handlerUrl(_element, "export_nodes"),
    import_nodes: payload.handler_urls?.import_nodes
      || runtime.handlerUrl(_element, "import_nodes"),
  };
  return {
    handlerUrls,
    initial_state: payload.initial_state,
    meta: payload.meta,
    runtime,
  };
}

// The editor opens on its own Studio page, so there are no other blocks for
// its styles to leak into, and it relies on Studio's modal-editor styles.
export const BranchingStudioEditor = makeXBlockInitializer(StudioApp, propsFactory, { isolateStyles: false });

(window as unknown as Record<string, unknown>).BranchingStudioEditor = BranchingStudioEditor;
