import React from "react";
import { render, screen } from "../test/helpers";
import StudentApp from "./StudentApp";
import { StudentInitialState } from "../apiTypes";

const retryNode = {
  id: "retry",
  title: "Try again",
  content: "<p>Threatening a rider breaks the guidelines.</p>",
  outcome: "retry",
  choices: [],
};

const state = {
  nodes: { retry: retryNode },
  start_node_id: "start",
  enable_undo: true,
  enable_scoring: false,
  enable_reset_activity: false,
  background_image_url: "",
  background_image_alt_text: "",
  background_image_is_decorative: false,
  max_score: 0,
  current_node: retryNode,
  history: ["start"],
  last_choice_text: "Talk to me like that again and you can get out.",
  score: 0,
  grade_report: {},
} as unknown as StudentInitialState;

const handlerUrls = { select_choice: "/s", undo_choice: "/u", reset_activity: "/r" };

describe("StudentApp outcome node", () => {
  it("shows the title, the learner's last choice and a way back", () => {
    const { container } = render(<StudentApp handlerUrls={handlerUrls} initial_state={state} />);

    expect(container.querySelector(".branching-scenario--outcome-retry")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("You chose")).toBeInTheDocument();
    expect(screen.getByText(state.last_choice_text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to the scenario" })).toBeEnabled();
  });

  it("hides the last choice on a regular node", () => {
    const node = { ...retryNode, outcome: "" };
    render(<StudentApp handlerUrls={handlerUrls} initial_state={{ ...state, current_node: node }} />);

    expect(screen.queryByText("You chose")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go Back" })).toBeInTheDocument();
  });
});
