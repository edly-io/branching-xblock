import React from "react";
import Form from "@openedx/paragon/dist/Form";
import { useIntl } from "react-intl";
import { studentMessages } from "../../messages";
import { Choice } from "../../types";

interface ChoiceOptionProps {
  choice: Choice;
  index: number;
  // Unique per block; also prefixes the option's element id.
  name: string;
  isSelected: boolean;
  onChange: (index: number) => void;
}

const ChoiceOption: React.FC<ChoiceOptionProps> = ({ choice, index, name, isSelected, onChange }) => {
  const intl = useIntl();
  const choiceId = `${name}-${index}`;
  return (
    <Form.Radio
      className={`choice-option${isSelected ? " is-selected" : ""}`}
      controlClassName="choice-option__input"
      labelClassName="choice-option__text"
      name={name}
      id={choiceId}
      value={index}
      checked={isSelected}
      onChange={() => onChange(index)}
    >
      {choice.text || intl.formatMessage(studentMessages.choiceLabel, { index: index + 1 })}
    </Form.Radio>
  );
};

export default ChoiceOption;
