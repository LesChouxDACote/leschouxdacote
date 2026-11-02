import styled from "@emotion/styled"
import React from "react"
import { FieldError } from "react-hook-form"
import { getButtonCss } from "src/components/Button"
import { ErrorMessage, Label, Row, Suffix } from "src/components/Form"
import { COLORS, LAYOUT } from "src/constants"

export { Required } from "src/components/Form"

export const StyledForm = styled.form`
  width: 100%;
  max-width: ${LAYOUT.formWidth}px;
  margin: 0 auto;
`
export const Title = styled.h1`
  text-align: center;
`

// Choix exclusif en forme de bouton blanc ; le choix retenu prend la bordure et le fond verts
const RadioButton = styled.div`
  ${getButtonCss("white")}
  padding: 12px 16px;
  text-align: center;
  width: 100%;
  cursor: pointer;
`
const RadioInput = styled.input`
  position: absolute;
  visibility: hidden;

  &:checked + ${RadioButton} {
    border-color: ${COLORS.green};
    background-color: ${COLORS.background.success};
    color: ${COLORS.green};
  }
`

interface InputProps {
  id?: string
  label: string
  error: FieldError | undefined
  suffix?: string
  required: boolean
  type?: string
  name: string
  register: any
  value?: string
}

export const Input: React.FC<InputProps & Record<string, any>> = ({
  label,
  error,
  required,
  suffix,
  type = "text",
  name,
  register,
  ...rest
}) => {
  return (
    <Label $error={Boolean(error)}>
      {label} {required && "*"}
      <Row>
        {rest.rows ? (
          <textarea name={name} {...register(name)} {...rest} />
        ) : (
          <input type={type} name={name} {...register(name)} {...rest} />
        )}

        {suffix && <Suffix>{suffix}</Suffix>}
      </Row>
      {error && <ErrorMessage>{error.message}</ErrorMessage>}
    </Label>
  )
}

export const Radio: React.FC<InputProps & Record<string, any>> = ({ label, id, name, value, register, ...rest }) => {
  return (
    <label>
      <RadioInput id={id} type="radio" name="role" {...register(name)} value={value} {...rest} />
      <RadioButton>{label}</RadioButton>
    </label>
  )
}

export const Radios = styled.div`
  margin: 48px 0;
  display: flex;
  gap: 16px;

  > * {
    flex: 1;
  }

  @media (max-width: ${LAYOUT.mobile}px) {
    flex-direction: column;
  }
`
