import React from "react";
import { fireEvent, render, screen } from "../../test/helpers";
import ChoiceForm from "./ChoiceForm";

const firstNodeChoices = [
  { text: "Go left", target_node_id: "node-2", score: 0 },
  { text: "Go right", target_node_id: "node-3", score: 0 },
];

const secondNodeChoices = [
  { text: "Continue", target_node_id: "node-4", score: 0 },
  { text: "Stop", target_node_id: "node-5", score: 0 },
];

describe("ChoiceForm", () => {
  it("clears the selected choice when the node changes", () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByLabelText("Go left"));
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();

    rerender(
      <ChoiceForm choices={secondNodeChoices} nodeId="node-2" onSubmit={onSubmit} />
    );

    expect(screen.getByLabelText("Continue")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("renders a lone choice as a button that submits it", () => {
    const onSubmit = jest.fn();
    render(
      <ChoiceForm choices={[{ text: "Next", target_node_id: "node-2", score: 0 }]} nodeId="node-1" onSubmit={onSubmit} />
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledWith(0);
  });

  it("disables the lone choice while a choice is being submitted", () => {
    const onSubmit = jest.fn();
    render(
      <ChoiceForm choices={[{ text: "Next", target_node_id: "node-2", score: 0 }]} nodeId="node-1" onSubmit={onSubmit} disabled />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
