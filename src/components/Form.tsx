import styled from "@emotion/styled"
import {
  FC,
  FormEvent,
  FormHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
} from "react"
import { DefaultValues, FieldValues, FormProvider, UnpackNestedValue, useForm, useFormContext } from "react-hook-form"
import { Button } from "src/components/Button"
import { COLORS, LAYOUT } from "src/constants"
import { handleError } from "src/helpers/errors"
import HttpError from "standard-http-error"

export class ValidationError extends Error {
  name = "ValidationError"
  field: string

  constructor(field: string, message: string) {
    super(message)
    this.field = field
  }
}

const StyledForm = styled.form`
  width: 100%;
  max-width: ${LAYOUT.formWidth}px;
  margin: 0 auto;
`
const Title = styled.h1`
  text-align: center;
`
const Required = styled.p`
  font-style: italic;
  color: ${COLORS.grey};
  text-align: center;
  margin: -1em 0 1em;
`

interface FormProps<A extends FieldValues, T extends UnpackNestedValue<A>>
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  title?: string
  hasRequired?: boolean
  onSubmit: Submit<A>
  defaultValues?: DefaultValues<T>
  resetOnChange?: any
}

export function Form<A extends FieldValues, T extends UnpackNestedValue<A>>({
  title,
  hasRequired,
  onSubmit,
  defaultValues,
  resetOnChange,
  children,
  ...delegated
}: FormProps<A, T>) {
  const form = useForm<T>({ defaultValues })

  useEffect(() => {
    form.reset({ ...defaultValues } as DefaultValues<T>)
  }, [resetOnChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    try {
      await form.handleSubmit((data) => onSubmit(data, event.target as HTMLFormElement))(event)
    } catch (error) {
      if (error instanceof ValidationError) {
        form.setError(error.field as any, { message: error.message }, { shouldFocus: true })
      } else if (error instanceof HttpError && error.code === 413) {
        alert(`Désolé, votre fichier image est trop gros.
La limite est pour l'instant de 5 Mo par photo.

Nous espérons lever cette limitation dans les semaines à venir.`)
      } else {
        handleError(error)
      }
    }
  }

  return (
    <FormProvider {...form}>
      <StyledForm method="POST" onSubmit={handleSubmit} {...delegated}>
        {title && <Title>{title}</Title>}
        {hasRequired && <Required>* champs obligatoires</Required>}
        {children}
      </StyledForm>
    </FormProvider>
  )
}

export const Row = styled.div`
  display: flex;
  align-items: center;

  label {
    margin: 0;
    flex: 1;

    &:not(:first-of-type) {
      margin-left: 20px;
    }
  }
`

export const Label = styled.label<{ $error?: boolean }>`
  display: block;
  position: relative;
  margin: 20px 0;
  color: ${({ $error }) => ($error ? COLORS.red : COLORS.dark)};

  input,
  textarea,
  select {
    display: block;
    width: 100%;
    margin: 4px 0;
    border-radius: 4px;
    border: 1px solid ${COLORS.border};
    padding: 8px;
    font-size: 1em;
  }

  input,
  textarea {
  }

  select {
    padding: 7px 4px;
  }
`
export const ErrorMessage = styled.span`
  color: ${COLORS.red};
`
export const Suffix = styled.div`
  margin-left: 10px;
`

interface InputProps {
  name: string
  label?: string
  suffix?: string
  validate?: (value: string) => true | string
  ref?: (el: any) => void
}

type CombinedAttributes = InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement> &
  SelectHTMLAttributes<HTMLSelectElement>

type WithTag = { Tag: "input" | "select" | "textarea" }

const BaseInput = forwardRef(
  ({ Tag, label, suffix, validate, name, ...props }: InputProps & CombinedAttributes & WithTag, forwardedRef) => {
    const { register, formState } = useFormContext()
    const error = formState.errors[name]

    const { ref, ...tagProps } = register(name, { validate })

    const handleRef = (el: any) => {
      ref(el)
      if (typeof forwardedRef === "function") {
        forwardedRef(el)
      }
    }

    return (
      <Label $error={Boolean(error)}>
        {label} {props.required && "*"}
        <Row>
          <Tag ref={handleRef} {...tagProps} {...props} />
          {suffix && <Suffix>{suffix}</Suffix>}
        </Row>
        {error && <ErrorMessage>{error.message?.toString()}</ErrorMessage>}
      </Label>
    )
  },
)
BaseInput.displayName = "BaseInput"

export const TextInput = forwardRef((props: InputProps & CombinedAttributes, ref) => (
  <BaseInput Tag={props.rows ? "textarea" : "input"} ref={ref} {...props} />
))
TextInput.displayName = "TextInput"

export const SelectInput = forwardRef((props: InputProps & CombinedAttributes, ref) => (
  <BaseInput Tag="select" ref={ref} {...props} />
))
SelectInput.displayName = "SelectInput"

export const StyledButton = styled(Button)<{ $fullWidth?: boolean }>`
  display: block;
  margin: 30px auto;
  min-width: 150px;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
`

interface SubmitButtonProps {
  fullWidth?: boolean
  children?: string
}

export const SubmitButton: FC<SubmitButtonProps> = ({ fullWidth = false, children = "Valider" }) => {
  const { formState } = useFormContext()

  return (
    <StyledButton type="submit" $variant="green" disabled={formState.isSubmitting} $fullWidth={fullWidth}>
      {formState.isSubmitting ? "Chargement…" : children}
    </StyledButton>
  )
}

interface BasicInputProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string
}

export const BasicInput = ({ name, ...props }: BasicInputProps) => {
  const { register } = useFormContext()
  return <input {...register(name)} {...props} />
}
