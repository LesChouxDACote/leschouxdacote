import { useFormContext } from "react-hook-form"
import { useRouter } from "next/router"

import MainLayout from "src/layouts/MainLayout"
import { Form, TextInput, SubmitButton, SelectInput, Row, ValidationError } from "src/components/Form"
import ProductEndDate from "src/components/ProductEndDate"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { usePlace } from "src/helpers/maps"
import { formatPricePerUnit } from "src/helpers/text"
import { validatePhoneNumber } from "src/helpers/validators"

// https://sharp.pixelplumbing.com/#formats
const ACCEPTED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"]

const PriceInfos = () => {
  const { watch } = useFormContext()
  const quantity = Number(watch("quantity"))
  const unit = watch("unit") as Unit
  const price = Number(watch("price")) * 100
  if (!quantity || !price) {
    return null
  }
  return <p>Soit {formatPricePerUnit({ price, quantity, unit })}</p>
}

const NewProductPage = () => {
  const { user, producer } = useUser()
  const { push } = useRouter()
  const place = usePlace(user && "place") // TODO: improve address input

  const handleSubmit: Submit<RegisteringProduct> = async (values, target) => {
    const data = new FormData(target)

    if (!data.get("email") && !data.get("phone")) {
      throw new ValidationError("email", "Vous devez au moins spécifier une adresse e-mail ou un numéro de téléphone")
    }

    if (!place) {
      throw new ValidationError("address", "Veuillez sélectionner l'adresse dans la liste déroulante")
    }

    data.append("city", place.city)
    data.append("lat", String(place.lat))
    data.append("lng", String(place.lng))
    data.append("uid", (user as User).uid)

    await api.post("product", data)
    push("/compte/annonces") // TODO: confirmation message
  }

  return (
    <MainLayout title="Créer une annonce">
      <Form title="Création d’une annonce" hasRequired onSubmit={handleSubmit}>
        <TextInput name="title" label="Titre" required maxLength={100} />
        <Row>
          <TextInput name="quantity" label="Quantité" type="number" min={0} step={0.01} />
          <SelectInput name="unit" label="Unité">
            <option></option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="l">litre(s)</option>
            <option value="u">pièce(s)</option>
          </SelectInput>
        </Row>
        <TextInput name="price" label="Prix total" required type="number" min={0} step={0.01} suffix="euros" />
        <PriceInfos />
        <TextInput name="address" label="Adresse" required placeholder="" id="place" />
        <TextInput name="description" label="Description" required rows={8} maxLength={4000} />
        <TextInput name="photo" label="Photo" type="file" required accept={ACCEPTED_MIMETYPES.join(",")} />
        <TextInput type="email" name="email" label="Adresse e-mail" defaultValue={user?.email} />
        <TextInput
          type="tel"
          name="phone"
          label="Téléphone"
          validate={validatePhoneNumber}
          defaultValue={producer?.phone}
        />
        <TextInput
          name="days"
          label="Publier maintenant pour une durée de :"
          type="number"
          min={0}
          step={1}
          defaultValue={0}
          suffix="jour(s)"
        />
        <ProductEndDate />
        <SubmitButton />
      </Form>
    </MainLayout>
  )
}

export default NewProductPage