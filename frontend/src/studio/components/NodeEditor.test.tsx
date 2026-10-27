import React from "react";
import { render, screen } from "../../test/helpers";
import { buildDraftNode } from "../reducer";
import NodeEditor from "./NodeEditor";

describe("NodeEditor", () => {
  it("highlights required title, content and choice text errors", () => {
    const node = buildDraftNode({ id: "n1", choices: [{ text: "", target_node_id: "n2", score: 0 }] });
    const { container } = render(
      <NodeEditor
        node={node}
        index={0}
        allNodes={[node, buildDraftNode({ id: "n2" })]}
        validation={{
          settingsFieldErrors: {},
          globalErrors: [],
          nodeErrorIds: new Set(["n1"]),
          nodeErrorTitles: {},
          nodeErrorDetails: {},
          nodeFieldErrors: {
            n1: {
              title: "Title is required.",
              content: "Content is required.",
              choiceTextByIndex: { 0: "Choice text is required." },
            },
          },
        }}
        onUpdateField={jest.fn()}
        onChangeChoice={jest.fn()}
        onAddChoice={jest.fn()}
        onDeleteChoice={jest.fn()}
        onSetMediaType={jest.fn()}
      />
    );

    expect(container.querySelector(".bx-input.is-error [data-role='node-title']")).not.toBeNull();
    expect(container.querySelector(".bx-textarea.is-error [data-role='node-content']")).not.toBeNull();
    expect(container.querySelector(".choice-text.is-error")).not.toBeNull();
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByText("Content is required.")).toBeInTheDocument();
    expect(screen.getByText("Choice text is required.")).toBeInTheDocument();
    expect(container.querySelectorAll(".bx-required")).toHaveLength(3);
    expect(container.querySelector("[data-role='node-title']")?.getAttribute("aria-required")).toBe("true");
  });
});
