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
  it("shows the parent's selection and reports a pick", () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" selectedIndex={null} onSelect={onSelect} onSubmit={jest.fn()} />
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Go right"));
    expect(onSelect).toHaveBeenCalledWith(1);

    rerender(
      <ChoiceForm choices={secondNodeChoices} nodeId="node-2" selectedIndex={0} onSelect={onSelect} onSubmit={jest.fn()} />
    );
    expect(screen.getByLabelText("Continue")).toBeChecked();
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  it("hides Submit when the host footer shows it", () => {
    render(
      <ChoiceForm choices={firstNodeChoices} nodeId="node-1" selectedIndex={0} onSelect={jest.fn()} onSubmit={jest.fn()} hideSubmit />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("renders a lone choice as a button that submits it", () => {
    const onSubmit = jest.fn();
    render(
      <ChoiceForm choices={[{ text: "Next", target_node_id: "node-2", score: 0 }]} nodeId="node-1" selectedIndex={null} onSelect={jest.fn()} onSubmit={onSubmit} />
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledWith(0);
  });

  it("disables the lone choice while a choice is being submitted", () => {
    const onSubmit = jest.fn();
    render(
      <ChoiceForm choices={[{ text: "Next", target_node_id: "node-2", score: 0 }]} nodeId="node-1" selectedIndex={null} onSelect={jest.fn()} onSubmit={onSubmit} disabled />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
