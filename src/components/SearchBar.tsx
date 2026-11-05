import styled from "@emotion/styled"
import { FormControlLabel } from "@mui/material"
import { useRouter } from "next/router"
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react"
import SearchIcon from "src/assets/search.svg"
import { Button } from "src/components/Button"
import SearchInput from "src/components/SearchInput"
import { COLORS, LAYOUT, SIZES } from "src/constants"
import { tagsIndex } from "src/helpers/algolia"
import { loadGmaps } from "src/helpers/google"
import CustomSwitch from "./CustomSwitch"

const Form = styled.form`
  position: relative;
  display: flex;
  flex-direction: column;
`
const CompactForm = styled(Form)`
  flex-direction: row;
  align-items: center;
`
const Fields = styled.div`
  position: relative;
  flex: 1;
`

export const BioSwitchLabelContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`
const CompactBioSwitchLabelContainer = styled(BioSwitchLabelContainer)`
  width: auto;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: 16px;
`

const BioSwitchLabel = styled(FormControlLabel)`
  .MuiFormControlLabel-label {
    font-weight: 300;
    font-size: ${SIZES.small}px;
    color: ${COLORS.muted};
  }
`

const Suggestions = styled.div`
  width: 50%;
  .pac-item-query {
    font-weight: 400;
    padding-left: 5px;
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    width: 100%;
    margin-top: -8px;
  }
`
const Submit = styled(Button)`
  width: 25px;
  height: 25px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  span {
    display: none;
  }
  svg {
    width: 50%;
    height: 50%;
    min-width: 12px;
    min-height: 12px;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    position: absolute;
    right: 6px;
    top: 4px;
  }
`

const getType = (types?: string[]) => {
  if (!types) {
    return "dpt"
  }
  if (types.includes("administrative_area_level_1")) {
    return "region"
  }
  if (types.includes("administrative_area_level_2")) {
    return "dpt"
  }
  if (types.includes("country")) {
    return "country"
  }
  return "city"
}

const ZOOM = {
  country: 5,
  city: 11,
  dpt: 8,
  region: 6,
}

const BIO_LABEL = "Uniquement des produits Bio ou issus de l'Agriculture raisonnée"

interface Props {
  className?: string
  // Interrupteur bio sur la même ligne que les champs, libellé court (header)
  compact?: boolean
}

const SearchBar = ({ className, compact }: Props) => {
  const router = useRouter()

  const [query, setQuery] = useState<SearchQuery>(router.query)
  const [focus, setFocus] = useState(false)
  const [suggestions, setSuggestions] = useState<AlgoliaTag[]>([])

  useEffect(() => {
    setQuery(router.query)
  }, [router.query])

  const autocomplete = useRef<google.maps.places.Autocomplete | null>(null)
  const input = useRef<HTMLInputElement | null>(null)

  const handleRef = (el: HTMLInputElement | null) => {
    loadGmaps().then(() => {
      if (!el || autocomplete.current || input.current) {
        return
      }
      input.current = el
      autocomplete.current = new google.maps.places.Autocomplete(el, {
        componentRestrictions: { country: "fr" },
        fields: ["geometry", "name", "types"],
        types: ["(regions)"],
      })
      autocomplete.current.addListener("place_changed", () => {
        const place = autocomplete.current?.getPlace()
        if (!place || !place.geometry) {
          setQuery((previous) => ({
            what: previous.what,
          }))
          return
        }
        const { location } = place.geometry
        const type = getType(place.types)
        const zoom = ZOOM[type]
        if (location) {
          setQuery((previous) => ({
            what: previous.what,
            where: place.name,
            type,
            ll: `${location.lat()},${location.lng()}`,
            z: String(zoom),
          }))
        }
      })
    })
  }

  const handleFocus = () => {
    setFocus(true)
  }
  const handleBlur = () => {
    setFocus(false)
  }

  const handleChange = ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = currentTarget
    const newQuery = {
      ...query,
      [name]: value,
    }
    if (name === "where") {
      delete newQuery.type
      delete newQuery.ll
      delete newQuery.z
    }
    setQuery(newQuery)
    if (name === "what") {
      if (value) {
        tagsIndex.search<AlgoliaTag>(value).then((result) => {
          setSuggestions(result.hits)
        })
      } else {
        setSuggestions([])
      }
    }
  }

  const handleBioChange = useCallback((event: React.SyntheticEvent, checked: boolean) => {
    setQuery((q) => {
      const newQuery = { ...q }
      if (checked) {
        newQuery.bio = "1"
      } else {
        delete newQuery.bio
      }
      return newQuery
    })
  }, [])

  const handleSuggestion = (tag: string) => () => {
    setQuery((previous) => ({
      ...previous,
      what: tag,
    }))
    setSuggestions([])
    setTimeout(() => {
      input.current?.focus()
    }, 90)
  }

  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !query.ll) {
      event.preventDefault()
    }
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    /*
    if (focus && suggestions.length === 1) {
      setQuery((previous) => ({
        ...previous,
        what: suggestions[0].tag,
      }))
      input.current?.focus()
      return
    }
    */
    if (query.where && !query.ll) {
      setQuery((previous) => ({
        ...previous,
        where: "",
      }))
      input.current?.focus()
      return
    }

    router.push({
      pathname: "/recherche",
      query,
    })
  }

  const fields = (
    <>
      <div>
        <SearchInput
          name="what"
          value={query.what || ""}
          onChange={handleChange}
          placeholder="Que recherchez-vous ?"
          autoComplete="off"
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {focus && suggestions.length > 0 && (
          <Suggestions className="pac-container">
            {suggestions.map(({ objectID, tag }) => (
              <div className="pac-item" key={objectID} onMouseDown={handleSuggestion(tag)}>
                <span className="pac-item-query">{tag}</span>
              </div>
            ))}
          </Suggestions>
        )}
        <SearchInput
          name="where"
          value={query.where || ""}
          onChange={handleChange}
          placeholder="Où ?"
          ref={handleRef}
          onKeyDown={handleKey}
        />
      </div>
      <Submit $variant="green" type="submit">
        <span>Rechercher</span>
        <SearchIcon />
      </Submit>
    </>
  )

  if (compact) {
    return (
      <CompactForm method="GET" action="/recherche" onSubmit={handleSearch} className={className}>
        <Fields>{fields}</Fields>
        <CompactBioSwitchLabelContainer>
          <BioSwitchLabel
            control={<CustomSwitch name="bio" />}
            label="Bio & raisonné"
            title={BIO_LABEL}
            checked={Boolean(query.bio)}
            onChange={handleBioChange}
          />
        </CompactBioSwitchLabelContainer>
      </CompactForm>
    )
  }

  return (
    <Form method="GET" action="/recherche" onSubmit={handleSearch} className={className}>
      {fields}
      <BioSwitchLabelContainer>
        <BioSwitchLabel
          control={<CustomSwitch name="bio" />}
          label={BIO_LABEL}
          checked={Boolean(query.bio)}
          onChange={handleBioChange}
        />
      </BioSwitchLabelContainer>
    </Form>
  )
}

export default SearchBar
