import React, { useState, useCallback } from "react";
import { useIntl } from "react-intl";
import { studentMessages } from "../messages";
import { StudentInitialState, StudentHandlerUrls } from "../apiTypes";
import * as api from "./api";
import MediaDisplay from "./components/MediaDisplay";
import ContentDisplay from "./components/ContentDisplay";
import HintCollapsible from "./components/HintCollapsible";
import ChoiceForm from "./components/ChoiceForm";
import ActionButtons from "./components/ActionButtons";
import GradeReport from "./components/GradeReport";
import TranscriptLink from "./components/TranscriptLink";
import { useHostFooter, HostFooterAction } from "./useHostFooter";

interface StudentAppProps {
  handlerUrls: StudentHandlerUrls;
  initial_state: StudentInitialState;
}

const StudentApp: React.FC<StudentAppProps> = ({ handlerUrls, initial_state }) => {
  const intl = useIntl();
  const [state, setState] = useState<StudentInitialState>(initial_state);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReportVisible, setIsReportVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const replaceState = useCallback((newState: StudentInitialState) => {
    setState(newState);
    setLoading(false);
    setIsReportVisible(false);
    setError(null);
    setStatusMessage(intl.formatMessage(studentMessages.contentUpdated));
  }, [intl]);

  const handleSelectChoice = useCallback(
    (choiceIndex: number) => {
      setLoading(true);
      setError(null);
      api.selectChoice(handlerUrls.select_choice, choiceIndex)
        .then(replaceState)
        .catch((err) => {
          setError(err.message || intl.formatMessage(studentMessages.errorSelectingChoice));
          setLoading(false);
        });
    },
    [handlerUrls.select_choice, replaceState, intl],
  );

  const handleUndo = useCallback(() => {
    setLoading(true);
    setError(null);
    api.undoChoice(handlerUrls.undo_choice)
      .then(replaceState)
      .catch((err) => {
        setError(err.message || intl.formatMessage(studentMessages.errorUndoChoice));
        setLoading(false);
      });
  }, [handlerUrls.undo_choice, replaceState, intl]);

  const handleReset = useCallback(() => {
    setLoading(true);
    setError(null);
    api.resetActivity(handlerUrls.reset_activity)
      .then(replaceState)
      .catch((err) => {
        setError(err.message || intl.formatMessage(studentMessages.errorResetActivity));
        setLoading(false);
      });
  }, [handlerUrls.reset_activity, replaceState, intl]);

  const handleShowReport = useCallback(() => {
    setIsReportVisible(true);
  }, []);

  const node = state.current_node || (state.start_node_id ? state.nodes[state.start_node_id] : null) || null;
  const choices = node?.choices || [];
  const outcome = node?.outcome || "";
  const canUndo = Boolean(state.enable_undo && state.history.length > 0);
  const isReportShown = isReportVisible && choices.length === 0 && state.enable_scoring;

  // The step's main button, handed to the host's footer when there is one:
  // Submit (or the lone choice's own text) on a question, Back to scenario on
  // a retry outcome. Anything else gives the footer back to the host.
  let footerAction: HostFooterAction | null = null;
  if (node && !isReportShown) {
    if (choices.length === 1) {
      footerAction = {
        label: choices[0].text || intl.formatMessage(studentMessages.next),
        enabled: !loading,
        run: () => handleSelectChoice(0),
      };
    } else if (choices.length > 1) {
      footerAction = {
        label: intl.formatMessage(studentMessages.submit),
        enabled: !loading && selectedIndex !== null,
        run: () => { if (selectedIndex !== null) { handleSelectChoice(selectedIndex); } },
      };
    } else if (outcome === "retry" && canUndo) {
      footerAction = {
        label: intl.formatMessage(studentMessages.backToScenario),
        enabled: !loading,
        run: handleUndo,
      };
    }
  }
  useHostFooter(footerAction);

  if (loading && !state.current_node) {
    return (
      <div className="branching-scenario">
        {intl.formatMessage(studentMessages.loading)}
      </div>
    );
  }

  if (!node) {
    return (
      <div className="branching-scenario">
        {error || intl.formatMessage(studentMessages.noContent)}
      </div>
    );
  }

  const media = node.media || { type: "", url: "" };
  const nodeId = node.id || "";
  const contentHtml = node.content || "";
  const isCompositeImage = media.type === "image";
  const overlayEnabled = Boolean(node.overlay_text) && isCompositeImage;

  const isLeaf = choices.length === 0;
  const isAtStartNode = node.id === state.start_node_id;
  const showReportButton = isLeaf && state.enable_scoring;
  const showReport = showReportButton && isReportVisible;
  const showReset = Boolean(state.enable_reset_activity && !isAtStartNode);
  const hasChoices = choices.length > 0;
  const showScore = !showReport && isLeaf && state.enable_scoring;
  const lastChoiceText = outcome ? state.last_choice_text || "" : "";
  const showTranscript = Boolean(
    (media.type === "audio" || media.type === "video") && node.transcript_url
  );

  return (
    <div className={`branching-scenario${outcome ? ` branching-scenario--outcome-${outcome}` : ""}`}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      <div className="active-scenario" data-role="active">
        {error && <div className="errors" style={{ color: "red", padding: "1em" }}>{error}</div>}

        {!showReport && (
          <>
            {outcome && (
              <div className={`node-outcome-mark node-outcome-mark--${outcome}`} aria-hidden="true">
                <span className={`fa ${outcome === "retry" ? "fa-refresh" : "fa-check-circle"}`} />
              </div>
            )}
            {node.title && <h3 className="node-title" data-role="title">{node.title}</h3>}
            {overlayEnabled ? null : (
              <ContentDisplay contentHtml={contentHtml} />
            )}
            {lastChoiceText && (
              <div className="node-last-choice" data-role="last-choice">
                <div className="node-last-choice__label">{intl.formatMessage(studentMessages.youChose)}</div>
                <div className="node-last-choice__text">{lastChoiceText}</div>
              </div>
            )}
            <MediaDisplay
              node={node}
              background_image_url={state.background_image_url}
              background_image_alt_text={state.background_image_alt_text}
              background_image_is_decorative={state.background_image_is_decorative}
              overlayEnabled={overlayEnabled}
              contentHtml={contentHtml}
            />
            <TranscriptLink url={showTranscript ? node.transcript_url || "" : ""} />
            <HintCollapsible hintText={node.hint || ""} nodeId={nodeId} />
          </>
        )}

        {!showReport && (
          <ChoiceForm choices={choices} nodeId={nodeId} onSubmit={handleSelectChoice} disabled={loading} onSelectionChange={setSelectedIndex} />
        )}

        <ActionButtons
          canUndo={canUndo}
          hasHistory={state.history.length > 0}
          showReset={showReset && !isReportVisible}
          showReport={showReportButton && !isReportVisible}
          hasChoices={hasChoices && !isReportVisible}
          isRetry={outcome === "retry"}
          onUndo={handleUndo}
          onReset={handleReset}
          onShowReport={handleShowReport}
        />

        {showScore && (
          <div className="score-display" data-role="score">
            {intl.formatMessage(studentMessages.scoreDisplay, { score: state.score, maxScore: state.max_score })}
          </div>
        )}

        <GradeReport
          reportData={state.grade_report}
          showResetInReport={showReset}
          onReset={handleReset}
          hidden={!showReport}
        />
      </div>
    </div>
  );
};

export default StudentApp;
