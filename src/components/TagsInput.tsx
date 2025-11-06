import styled from "@emotion/styled"
import { ChangeEvent, FocusEvent, KeyboardEvent, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import CustomSwitch from "src/components/CustomSwitch"
import { Label } from "src/components/Form"
import { COLORS } from "src/constants"
import { tagsIndex } from "src/helpers/algolia"

const Tag = styled.span`
  display: inline-block;
  background-color: #dcd9d9;
  box-shadow: 0px 3px 3px ${COLORS.shadow.light};
  border-radius: 12px;
  margin: 4px 12px 8px 0;
  padding: 4px 8px 4px 10px;
  button {
    margin-left: 8px;
    background-color: ${COLORS.input};
    border-radius: 100%;
    color: white;
    line-height: 18px;
    font-weight: 100;
  }
`
const Suggestions = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
  background-color: white;
  border: 1px solid ${COLORS.border};
  padding: 4px 0;
  box-shadow: 0px 3px 3px ${COLORS.shadow.light};
  button {
    padding: 4px 8px;
    width: 100%;
    text-align: left;
    &:hover {
      background-color: ${COLORS.odd};
    }
  }
`

interface Props {
  label?: string
}

const TagsInput = ({ label }: Props) => {
  const { register, getValues, setValue, watch } = useFormContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<AlgoliaTag[]>([])
  register("_tags")
  const values: string[] = watch("_tags") || []

  const add = (value: string) => {
    setValue("_tags", [...values, value])
  }
  const remove = (value: string) => {
    setValue(
      "_tags",
      values.filter((val) => val !== value),
    )
  }
  const reset = () => {
    setSuggestions([])
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleChange = async ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
    const text = currentTarget.value
    if (!text) {
      reset()
      return
    }
    const { hits } = await tagsIndex.search<AlgoliaTag>(text)
    setSuggestions(hits.filter(({ tag }) => !values.includes(tag)))
  }

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (suggestions.length === 1) {
        add(suggestions[0].tag)
        reset()
      }
    }
  }

  const handleBlur = ({ currentTarget }: FocusEvent<HTMLInputElement>) => {
    if (suggestions.length === 1) {
      add(suggestions[0].tag)
      reset()
    } else if (currentTarget.value) {
      currentTarget.focus()
    }
  }

  const handleSelect = (tag: string) => () => {
    add(tag)
    reset()
  }

  return (
    <Label htmlFor={"_tags"}>
      <div>{label}</div>
      <label>
        <CustomSwitch name="bio" defaultChecked={getValues("bio")} /> Bio ou agriculture raisonnée
      </label>
      <div>
        {values.map((value) => (
          <Tag key={value}>
            {value}
            <button type="button" onClick={() => remove(value)}>
              ×
            </button>
          </Tag>
        ))}
      </div>
      <input type="hidden" name={"_tags"} value={values.join(",")} />
      <input
        id={"_tags"}
        onChange={handleChange}
        ref={inputRef}
        onKeyPress={handleKey}
        onBlur={handleBlur}
        placeholder="Exemples : légume, miel, fromage…"
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <Suggestions>
          {suggestions.map(({ objectID, tag }) => (
            <button key={objectID} onClick={handleSelect(tag)} type="button">
              {tag}
            </button>
          ))}
        </Suggestions>
      )}
    </Label>
  )
}

export default TagsInput
