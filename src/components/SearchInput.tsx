import styled from "@emotion/styled"
import { lighten } from "polished"
import { inputCss } from "src/components/Form"
import { COLORS, LAYOUT } from "src/constants"

const SearchInput = styled.input`
  ${inputCss}
  padding: 6px 16px;
  outline: none;

  &::placeholder {
    font-weight: 300;
  }

  &:active,
  &:focus {
    position: relative;
    box-shadow: 0 0 0 0.25rem ${lighten(0.3, COLORS.muted)};
  }

  width: 100%;
  @media (min-width: ${LAYOUT.mobile}px) {
    width: 50%;
    &:first-of-type {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    &:not(:first-of-type) {
      margin-left: -1px;
    }
    &:last-of-type {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      padding-right: 8%;
    }
  }
`

export default SearchInput
