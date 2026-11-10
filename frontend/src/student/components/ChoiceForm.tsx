import React, { useId } from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";
import ChoiceOption from "./ChoiceOption";

interface ChoiceFormProps {
  choices: Choice[];
  nodeId: string;
  // The picked option. The parent owns it, so a host footer button submits
  // the same choice the radios show, and clears it when the node changes.
  selectedIndex: number | null;
  onSelect: (choiceIndex: number) => void;
  onSubmit: (choiceIndex: number) => void;
  // True while a choice is being submitted: a second tap would be applied to
  // the next node and skip it.
  disabled?: boolean;
  // True when the host page's footer shows the submit button instead.
  hideSubmit?: boolean;
}

const ChoiceForm: React.FC<ChoiceFormProps> = ({
  choices, nodeId, selectedIndex, onSelect, onSubmit, disabled = false, hideSubmit = false,
}) => {
  const intl = useIntl();
  const radioName = useId();
  const hasChoices = choices.length > 0;

  // A lone choice ("Next", "Continue") has nothing to pick between, so it is
  // just the button that follows it.
  if (choices.length === 1) {
    if (hideSubmit) {
      return null;
    }
    return (
      <div className="choices choices--single" data-role="choices">
        <Button
          type="button"
          variant="primary"
          className="choice-submit-button action-primary btn-primary"
          data-role="submit-choice"
          disabled={disabled}
          onClick={() => onSubmit(0)}
        >
          {choices[0].text || intl.formatMessage(studentMessages.next)}
        </Button>
      </div>
    );
  }

  return (
    <div className="choices" data-role="choices">
      <h3 id={`choice-heading-${nodeId}`} className="choices-heading" data-role="choice-heading" style={{ display: hasChoices ? undefined : "none" }}>
        {intl.formatMessage(studentMessages.chooseNextStep)}
      </h3>
      <Form
        className="choices-form"
        data-role="choice-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (selectedIndex !== null) {
            onSubmit(selectedIndex);
          }
        }}
      >
        <div className="choices-list" data-role="choice-list" role="radiogroup" aria-labelledby={`choice-heading-${nodeId}`}>
          {choices.map((choice, idx) => (
            <ChoiceOption
              key={`${nodeId}-${idx}`}
              choice={choice}
              index={idx}
              nodeId={nodeId}
              name={radioName}
              isSelected={selectedIndex === idx}
              onChange={onSelect}
            />
          ))}
        </div>
        {hasChoices && !hideSubmit && (
          <Button
            type="submit"
            variant="primary"
            className="choice-submit-button action-primary btn-primary"
            data-role="submit-choice"
            disabled={disabled || selectedIndex === null}
          >
            {intl.formatMessage(studentMessages.submit)}
          </Button>
        )}
      </Form>
    </div>
  );
};

export default ChoiceForm;
