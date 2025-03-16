import styled from "@emotion/styled"
import { differenceInCalendarDays } from "date-fns"
import { Schema as Sc } from "effect"
import { stringify } from "effect/FastCheck"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import { DefaultValues, useFormContext } from "react-hook-form"
import { Form, Row, SelectInput, SubmitButton, TextInput, ValidationError } from "src/components/Form"
import ProductEndDate from "src/components/ProductEndDate"
import SlotsForm from "src/components/Slots"
import TagsInput from "src/components/TagsInput"
import { MAX_PUBLICATION_DAYS } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { useObjectQuery } from "src/helpers/firebase"
import { getCity, getDpt, loadGmaps } from "src/helpers/google"
import { formatPricePerUnit } from "src/helpers/text"
import { validatePhoneNumber } from "src/helpers/validators"
import Layout from "src/layout"
import type { AuthUser, Producer, Product, ProductPayload, Unit } from "src/types/model"
// https://sharp.pixelplumbing.com/#formats
const ACCEPTED_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"]

const Photo = styled.img`
  width: 100%;
`
const SlotDate = Sc.Date.annotations({
  message: () => "Veuillez entrer une date.",
  override: true,
}).pipe(Sc.filter((date) => date >= new Date() || "La date doit être dans le futur"))

export const SlotSchema = Sc.Struct({
  date: SlotDate,
  heureDebut: Sc.String,
  heureFin: Sc.String,
}).pipe(
  Sc.filter((slot) => {
    const heureDebut = new Date(`1970-01-01T${slot.heureDebut}:00`)
    const heureFin = new Date(`1970-01-01T${slot.heureFin}:00`)
    return heureDebut < heureFin || "L'heure de début doit être avant l'heure de fin"
  }),
)

export type Slot = typeof SlotSchema.Type

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

const EditProductPage = () => {
  const { authUser, user } = useUser<Producer>()
  const [slots, setSlots] = useState<readonly Slot[]>([])
  const { query, push } = useRouter()

  const productId = Array.isArray(query.id) ? undefined : query.id

  const { data, loading } = useObjectQuery<Product>("products", productId)

  const [place, setPlace] = useState<Place | null>()

  useEffect(() => {
    if (place === undefined && data) {
      setPlace({ id: data.placeId, city: data.city, dpt: data.dpt, lat: data._geoloc.lat, lng: data._geoloc.lng })

      const slots = data.slots ? Sc.decodeUnknownSync(Sc.Array(SlotSchema))(data.slots) : []
      setSlots(slots)
    }
  }, [place, data])

  const title = productId ? "Modifier une annonce" : "Créer une annonce"

  const defaultValues: DefaultValues<ProductPayload> | undefined = data && {
    ...data,
    price: data.price / 100,
    days: String(data.expires && data.expires > Date.now() ? differenceInCalendarDays(data.expires, new Date()) : 0),
    photo: "",
  }

  const handleSubmit: Submit<ProductPayload> = async (values, target) => {
    const payload = new FormData(target)
    if (!payload.get("email") && !payload.get("phone")) {
      throw new ValidationError("email", "Vous devez au moins spécifier une adresse e-mail ou un numéro de téléphone")
    }

    if (!place) {
      throw new ValidationError("address", "Veuillez sélectionner l'adresse dans la liste déroulante")
    }

    if (payload.get("days") === "0") {
      const ok = confirm("Êtes-vous sûr·e de ne pas vouloir publier cette annonce ?\n(durée renseignée : 0 jours)")
      if (!ok) {
        return
      }
    }

    payload.append("placeId", place.id)
    payload.append("lat", String(place.lat))
    payload.append("lng", String(place.lng))
    payload.append("city", place.city)
    payload.append("dpt", place.dpt)
    payload.append("uid", (authUser as AuthUser).uid)
    payload.append("slots", stringify(Sc.encodeSync(Sc.Array(SlotSchema))(slots)))

    if (productId) {
      payload.append("id", productId)
      await api.put("product", payload)
      alert("Votre annonce a bien été modifiée. La modification sera visible dans quelques minutes.")
    } else {
      await api.post("product", payload)
      alert("Votre annonce a bien été créée. Elle sera visible dans quelques minutes.")
    }

    push("/compte/producteur/annonces") // TODO: confirmation message
  }

  const autocomplete = useRef<google.maps.places.Autocomplete>()
  const handleRef = async (el: HTMLInputElement | null) => {
    if (!el || autocomplete.current) {
      return
    }

    await loadGmaps()

    autocomplete.current = new google.maps.places.Autocomplete(el, {
      componentRestrictions: { country: "fr" },
      fields: ["geometry", "address_components", "place_id"], // TODO: get more infos?
      // types: ["geocode", "establishment"], // https://developers.google.com/places/web-service/supported_types#table3
    })
    autocomplete.current.addListener("place_changed", () => {
      const res = autocomplete.current?.getPlace()
      if (!res || !res.geometry || !res.address_components || !res.place_id) {
        setPlace(null)
        return
      }

      const city = getCity(res)
      const dpt = getDpt(res)
      if (!city || !dpt) {
        setPlace(null)
        return
      }

      const { location } = res.geometry
      setPlace({
        id: res.place_id,
        lat: location.lat(),
        lng: location.lng(),
        city,
        dpt,
      })
    })
  }

  return (
    <Layout title={title} loading={loading}>
      <Form
        title={title}
        hasRequired
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        resetOnChange={data?.objectID}
      >
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
        <TextInput
          name="address"
          label="Adresse de la vente (ferme, magasin, marché, point de distribution…)"
          required
          placeholder=""
          id="place"
          ref={handleRef}
        />
        <TextInput name="description" label="Description" required rows={8} maxLength={4000} />
        <TagsInput label="Mots-clés" />
        {data && <Photo src={data.photo} />}
        <TextInput
          name="photo"
          label={productId ? "Changer la photo" : "Photo"}
          type="file"
          required={productId ? false : true}
          accept={ACCEPTED_MIMETYPES.join(",")}
        />
        <TextInput type="email" name="email" label="Adresse e-mail" defaultValue={authUser?.email} />
        <TextInput
          type="tel"
          name="phone"
          label="Téléphone"
          validate={validatePhoneNumber}
          defaultValue={user?.phone}
        />
        <TextInput
          name="days"
          label="Publier maintenant pour une durée de :"
          type="number"
          min={0}
          max={MAX_PUBLICATION_DAYS}
          step={1}
          defaultValue={0}
          suffix="jour(s)"
        />
        <ProductEndDate />
        <SlotsForm setSlots={setSlots} slots={slots} />
        <SubmitButton />
      </Form>
    </Layout>
  )
}

export default EditProductPage
