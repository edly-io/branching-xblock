import React, { useEffect, useState } from "react";
import Button from "@openedx/paragon/dist/Button";
import Form from "@openedx/paragon/dist/Form";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";
import ChoiceOption from "./ChoiceOption";

interface ChoiceFormProps {
  choices: Choice[];
  nodeId: string;
  onSubmit: (choiceIndex: number) => void;
  // True while a choice is being submitted: a second tap would be applied to
  // the next node and skip it.
  disabled?: boolean;
}

const ChoiceForm: React.FC<ChoiceFormProps> = ({ choices, nodeId, onSubmit, disabled = false }) => {
  const intl = useIntl();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasChoices = choices.length > 0;

  useEffect(() => {
    setSelectedIndex(null);
  }, [nodeId]);

  // A lone choice ("Next", "Continue") has nothing to pick between, so it is
  // just the button that follows it.
  if (choices.length === 1) {
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
              isSelected={selectedIndex === idx}
              onChange={setSelectedIndex}
            />
          ))}
        </div>
        {hasChoices && (
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
