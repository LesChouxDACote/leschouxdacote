import { useEffect, useRef } from "react"

const ID = "GMAPS"

type Callback = () => void

const callbacks: Callback[] = []

declare global {
  interface Window {
    initMap: () => void
  }
}

export const loadGmaps = () =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(ID)
    if (existing) {
      if (window.google) {
        resolve()
      } else {
        callbacks.push(resolve)
      }
      return
    }
    callbacks.push(resolve)
    window.initMap = () => {
      callbacks.forEach((cb) => cb())
    }
    const tag = document.createElement("script")
    tag.id = ID
    tag.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_FIREBASE_KEY}&libraries=places&callback=initMap`
    tag.onerror = reject
    document.head.appendChild(tag)
  })

// Suggestions d'adresses Google sur un champ texte : renvoie le callback de ref à poser sur l'input,
// et appelle onPlace à chaque adresse choisie dans la liste
export const usePlacesAutocomplete = (onPlace: (place: google.maps.places.PlaceResult) => void) => {
  const autocomplete = useRef<google.maps.places.Autocomplete | null>(null)
  const bound = useRef<HTMLInputElement | null>(null)
  const callback = useRef(onPlace)

  useEffect(() => {
    callback.current = onPlace
  })

  return (el: HTMLInputElement | null) => {
    if (!el) {
      return
    }

    void loadGmaps().then(() => {
      // vérifié après le chargement : chaque rendu rappelle ce callback pendant que Google Maps charge,
      // et sans cela chacun créait son Autocomplete — des listes de suggestions superposées sur le même champ.
      // Un champ remonté (ex. inscription : changement de rôle) est un nouvel élément, à rebrancher.
      if (bound.current === el) {
        return
      }
      if (autocomplete.current) {
        google.maps.event.clearInstanceListeners(autocomplete.current)
      }
      bound.current = el
      const instance = new google.maps.places.Autocomplete(el, {
        componentRestrictions: { country: "fr" },
        fields: ["geometry", "address_components", "place_id", "formatted_address"],
        // types: ["geocode", "establishment"], // https://developers.google.com/places/web-service/supported_types#table3
      })
      autocomplete.current = instance
      instance.addListener("place_changed", () => {
        callback.current(instance.getPlace())
      })
    })
  }
}

// Adresse affichée avec son code postal, sans le pays : « 1 Pl. du Capitole, 31000 Toulouse »
export const formatAddress = ({ formatted_address, address_components }: google.maps.places.PlaceResult) => {
  if (!formatted_address) {
    return null
  }
  const country = address_components?.find(({ types }) => types.includes("country"))
  const suffix = `, ${country?.long_name || "France"}`
  return formatted_address.endsWith(suffix) ? formatted_address.slice(0, -suffix.length) : formatted_address
}

export const getCity = ({ address_components }: google.maps.places.PlaceResult) => {
  if (!address_components) {
    return null
  }
  const city = address_components.find(({ types }) => types.includes("locality"))
  if (!city) {
    return null
  }
  return city.short_name
}

const DPT_MAP: Record<string, string> = {
  Ain: "01",
  Aisne: "02",
  Allier: "03",
  "Alpes-de-Haute-Provence": "04",
  "Hautes-Alpes": "05",
  "Alpes-Maritimes": "06",
  Ardèche: "07",
  Ardennes: "08",
  Ariège: "09",
  Aube: "10",
  Aude: "11",
  Aveyron: "12",
  "Bouches-du-Rhône": "13",
  Calvados: "14",
  Cantal: "15",
  Charente: "16",
  "Charente-Maritime": "17",
  Cher: "18",
  Corrèze: "19",
  "Corse-du-Sud": "2A",
  "Haute-Corse": "2B",
  "Côte-d'Or": "21",
  "Côtes-d'Armor": "22",
  Creuse: "23",
  Dordogne: "24",
  Doubs: "25",
  Drôme: "26",
  Eure: "27",
  "Eure-et-LoirNote 4": "28",
  Finistère: "29",
  Gard: "30",
  "Haute-Garonne": "31",
  Gers: "32",
  Gironde: "33",
  Hérault: "34",
  "Ille-et-Vilaine": "35",
  Indre: "36",
  "Indre-et-Loire": "37",
  Isère: "38",
  Jura: "39",
  Landes: "40",
  "Loir-et-Cher": "41",
  Loire: "42",
  "Haute-Loire": "43",
  "Loire-Atlantique": "44",
  Loiret: "45",
  Lot: "46",
  "Lot-et-Garonne": "47",
  Lozère: "48",
  "Maine-et-LoireNote 5": "49",
  Manche: "50",
  Marne: "51",
  "Haute-Marne": "52",
  Mayenne: "53",
  "Meurthe-et-Moselle": "54",
  Meuse: "55",
  Morbihan: "56",
  Moselle: "57",
  Nièvre: "58",
  Nord: "59",
  Oise: "60",
  Orne: "61",
  "Pas-de-Calais": "62",
  "Puy-de-Dôme": "63",
  "Pyrénées-Atlantiques": "64",
  "Hautes-Pyrénées": "65",
  "Pyrénées-Orientales": "66",
  "Bas-Rhin10": "67",
  "Haut-Rhin10": "68",
  "RhôneNote 6": "69",
  "Haute-Saône": "70",
  "Saône-et-Loire": "71",
  Sarthe: "72",
  Savoie: "73",
  "Haute-Savoie": "74",
  "Département de Paris": "75",
  "Seine-Maritime": "76",
  "Seine-et-Marne": "77",
  Yvelines: "78",
  "Deux-Sèvres": "79",
  Somme: "80",
  Tarn: "81",
  "Tarn-et-Garonne": "82",
  Var: "83",
  Vaucluse: "84",
  Vendée: "85",
  Vienne: "86",
  "Haute-Vienne": "87",
  Vosges: "88",
  Yonne: "89",
  "Territoire de Belfort": "90",
  Essonne: "91",
  "Hauts-de-Seine": "92",
  "Seine-Saint-Denis": "93",
  "Val-de-Marne": "94",
  "Val-d'Oise": "95",
  Guadeloupe: "971",
  Martinique: "972",
  Guyane: "973",
  "La Réunion": "974",
  Mayotte: "976",
}

export const getDpt = ({ address_components }: google.maps.places.PlaceResult) => {
  if (!address_components) {
    return null
  }
  const postCode = address_components.find(({ types }) => types.includes("postal_code"))
  if (postCode) {
    return postCode.short_name.substr(0, 2)
  }
  const dpt = address_components.find(({ types }) => types.includes("administrative_area_level_2"))
  if (dpt) {
    return DPT_MAP[dpt.short_name] || null
  }
  return null
}
