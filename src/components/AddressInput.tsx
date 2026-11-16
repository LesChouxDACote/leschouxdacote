import { ComponentProps } from "react"
import { useFormContext } from "react-hook-form"
import { TextInput } from "src/components/Form"
import { formatAddress, usePlacesAutocomplete } from "src/helpers/google"

type Props = Omit<ComponentProps<typeof TextInput>, "ref" | "rows"> & {
  onPlace?: (place: google.maps.places.PlaceResult) => void
}

// Champ « Adresse » d'un <Form> : suggestions Google, et l'adresse choisie s'écrit avec son code postal
const AddressInput = ({ name, onPlace, ...props }: Props) => {
  const { setValue } = useFormContext()

  const handleRef = usePlacesAutocomplete((place) => {
    const address = formatAddress(place)
    if (address) {
      setValue(name, address, { shouldDirty: true })
    }
    onPlace?.(place)
  })

  return <TextInput name={name} autoComplete="off" ref={handleRef} {...props} />
}

export default AddressInput
