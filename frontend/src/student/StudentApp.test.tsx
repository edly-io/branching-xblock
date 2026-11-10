import React from "react";
import { act, fireEvent, render, screen } from "../test/helpers";
import { HOST, frameIn, hostSays, unframe } from "../test/hostFrame";
import StudentApp, { FOOTER_LABEL_MAX_LENGTH } from "./StudentApp";
import * as api from "./api";
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

describe("StudentApp host footer", () => {
  const question = (id: string, texts: string[]) => ({
    id,
    title: id,
    content: "<p>Pick one.</p>",
    outcome: "",
    choices: texts.map((text, i) => ({ text, target_node_id: `${id}-${i}`, score: 0 })),
  });
  const at = (node: object, history: string[] = []) => ({ ...state, current_node: node, history }) as unknown as StudentInitialState;
  const footerPosts = (parent: Window) => (parent.postMessage as jest.Mock).mock.calls
    .filter(([msg]) => msg.type === "plugin.footerAction")
    .map(([msg]) => msg.payload);

  let parent: Window;

  beforeEach(() => {
    parent = frameIn();
  });

  afterEach(() => {
    unframe();
    jest.restoreAllMocks();
  });

  it("offers Submit once a choice is picked, and keeps its own until the host accepts", () => {
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["A", "B"]))} />);
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Submit", enabled: false });

    fireEvent.click(screen.getByLabelText("B"));
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Submit", enabled: true });
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();

    hostSays(parent, "uber.footerActionAccepted");
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("submits the picked choice on the host click and never offers it on the next node", async () => {
    const next = question("q2", ["X", "Y"]);
    const select = jest.spyOn(api, "selectChoice").mockResolvedValue(at(next, ["q"]));
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["A", "B", "C"]))} />);

    fireEvent.click(screen.getByLabelText("C"));
    (parent.postMessage as jest.Mock).mockClear();
    hostSays(parent, "uber.footerActionClicked");
    await screen.findByLabelText("X");

    expect(select).toHaveBeenCalledWith("/s", 2);
    expect(footerPosts(parent)).not.toContainEqual({ label: "Submit", enabled: true });
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Submit", enabled: false });
    expect(screen.getByLabelText("X")).not.toBeChecked();
    expect(screen.getByLabelText("Y")).not.toBeChecked();
  });

  it("labels a lone choice with its text, or Next when the text is too long", () => {
    const { unmount } = render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["Continue"]))} />);
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Continue", enabled: true });
    unmount();

    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["x".repeat(FOOTER_LABEL_MAX_LENGTH + 1)]))} />);
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Next", enabled: true });
  });

  it("offers Back to the scenario on a retry outcome and hides its own once accepted", () => {
    render(<StudentApp handlerUrls={handlerUrls} initial_state={state} />);
    expect(footerPosts(parent).at(-1)).toEqual({ label: "Back to the scenario", enabled: true });

    hostSays(parent, "uber.footerActionAccepted");
    expect(screen.queryByRole("button", { name: "Back to the scenario" })).not.toBeInTheDocument();
  });

  it("leaves the footer alone on mount when the node has no main button", () => {
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at({ ...retryNode, outcome: "" }, ["start"])} />);
    expect(footerPosts(parent)).toEqual([]);
  });

  it("hands the footer back when it reaches a node without a main button", async () => {
    jest.spyOn(api, "selectChoice").mockResolvedValue(at({ ...retryNode, outcome: "" }, ["q"]));
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["Continue"]))} />);

    hostSays(parent, "uber.footerActionClicked");
    await screen.findByRole("button", { name: "Go Back" });
    expect(footerPosts(parent).at(-1)).toBeNull();
  });

  it("submits a lone choice on the host click", async () => {
    const select = jest.spyOn(api, "selectChoice").mockResolvedValue(at(question("q2", ["X", "Y"]), ["q"]));
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["Continue"]))} />);

    hostSays(parent, "uber.footerActionClicked");
    await screen.findByLabelText("X");
    expect(select).toHaveBeenCalledWith("/s", 0);
  });

  it("submits once when two host clicks arrive before it re-renders", async () => {
    const select = jest.spyOn(api, "selectChoice").mockResolvedValue(at(question("q2", ["X", "Y"]), ["q"]));
    render(<StudentApp handlerUrls={handlerUrls} initial_state={at(question("q", ["Continue"]))} />);

    act(() => {
      ["first", "second"].forEach(() => window.dispatchEvent(new MessageEvent("message", {
        data: { type: "uber.footerActionClicked" }, source: parent, origin: HOST,
      })));
    });
    await screen.findByLabelText("X");
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("goes back to the scenario on the host click from a retry outcome", async () => {
    const undo = jest.spyOn(api, "undoChoice").mockResolvedValue(at(question("start", ["A", "B"])));
    render(<StudentApp handlerUrls={handlerUrls} initial_state={state} />);

    hostSays(parent, "uber.footerActionClicked");
    await screen.findByLabelText("A");
    expect(undo).toHaveBeenCalledWith("/u");
  });

  it("keeps two blocks' radios apart when their node ids match", () => {
    const initial = at(question("start", ["A", "B"]));
    render(
      <>
        <StudentApp handlerUrls={handlerUrls} initial_state={initial} />
        <StudentApp handlerUrls={handlerUrls} initial_state={initial} />
      </>,
    );
    const [firstB, secondB] = screen.getAllByLabelText("B");
    fireEvent.click(secondB);
    expect(secondB).toBeChecked();
    expect(firstB).not.toBeChecked();
  });
});
