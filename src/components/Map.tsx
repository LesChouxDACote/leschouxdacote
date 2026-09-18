import styled from "@emotion/styled"
import mapboxgl, { AnyLayer, GeoJSONSource, Map, PopupOptions } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useRouter } from "next/router"
import { useEffect, useRef, useState } from "react"
import PlacePopup from "src/components/PlacePopup"
import { LAYOUT } from "src/constants"
import { ProductEncoded } from "src/models/Product"
import type { Product } from "src/types/model"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

const MAP_STYLE = "mapbox://styles/mapbox/streets-v11"
const NAV_OPTIONS = { showCompass: false }
const MAP_LOCALE = {
  "NavigationControl.ZoomIn": "Zoomer",
  "NavigationControl.ZoomOut": "Dézoomer",
}
const ANIMATION_DURATION = 1000
const DEFAULT_COORDS: Coordinates = [1.7, 46.7] // France
const DEFAULT_ZOOM = 5
const MARKER_NAME = "marker"
const MARKER_URI = "/marker.png"
const SOURCE_NAME = "source"
const MARKER_LAYER: AnyLayer = {
  id: "layer",
  type: "symbol",
  source: SOURCE_NAME,
  layout: {
    "icon-image": MARKER_NAME,
    "icon-size": 0.5,
  },
}
const POPUP_OPTIONS: PopupOptions = {
  offset: 15,
  maxWidth: LAYOUT.mapPopupWidth + "px",
}

type Places = Record<Product["placeId"], Place>
const getFeatures = (places: Places) => {
  return {
    type: "FeatureCollection",
    features: Object.keys(places).map((id) => {
      const place = places[id]
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: place.coordinates,
        },
        properties: {
          place,
        },
      }
    }),
  } as GeoJSON.FeatureCollection
}

const getCoordinates = (ll?: string) => {
  if (!ll) {
    return DEFAULT_COORDS
  }
  return ll.split(",").reverse().map(Number) as Coordinates
}

const getPlaceId = ({ _geoloc }: ProductEncoded) => {
  // because Google's placeId is unstable
  // https://developers.google.com/maps/documentation/places/web-service/place-id
  return `${_geoloc.lng.toFixed(4)},${_geoloc.lat.toFixed(4)}`
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  .mapboxgl-ctrl-bottom-left,
  .mapboxgl-ctrl-bottom-right {
    display: none;
  }
  .mapboxgl-popup-content {
    padding: 0;
  }
`

// mapbox-gl v3 : zoomend/dragend émettent des events sans originalEvent
// (handleMove ignore le cas) ; on accepte le plus petit dénominateur commun
type MoveEvent = { type: string; target: Map; originalEvent?: MouseEvent | TouchEvent | WheelEvent }

interface MapProps {
  products: ProductEncoded[]
}

interface Place {
  coordinates: Coordinates
  products: ProductEncoded[]
}

const Mapbox = ({ products }: MapProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [placePopup, setPlacePopup] = useState<Place>()
  const { query, replace } = useRouter()
  const { type, ll, z } = query as SearchQuery
  const center = getCoordinates(ll)
  const zoom = Number(z) || DEFAULT_ZOOM
  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    if (!mapRef.current) {
      return
    }
    if (center && zoom) {
      mapRef.current.fitBounds([center, center], { zoom, duration: ANIMATION_DURATION })
    }
  }, [loaded, type, zoom, ll]) // eslint-disable-line

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center,
      zoom,
      locale: MAP_LOCALE,
    })

    map.addControl(new mapboxgl.NavigationControl(NAV_OPTIONS))

    // mapbox-gl v3 : langue native des libellés, remplace le plugin mapbox-gl-language
    map.setLanguage("fr")

    map.on("load", () => {
      map.loadImage(MARKER_URI, (error, image) => {
        if (error) {
          throw error
        }
        if (image) {
          map.addImage(MARKER_NAME, image)
        }
      })
      map.addSource(SOURCE_NAME, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      })
      map.addLayer(MARKER_LAYER)
      setLoaded(true)
    })

    const handleMove = ({ originalEvent }: MoveEvent) => {
      if (!originalEvent) {
        // weird shit => ignore
        return
      }
      const { lat, lng } = map.getCenter()
      const bounds = map.getBounds()
      if (!bounds) {
        // bounds non disponibles pendant le rendu de la carte => ignorer
        return
      }
      const diagonal = bounds.getNorthWest().distanceTo(bounds.getSouthEast())
      const radius = Math.round(diagonal / 2)

      replace({
        query: {
          ...queryRef.current,
          ll: `${lat.toFixed(6)},${lng.toFixed(6)}`,
          z: map.getZoom().toFixed(6),
          r: radius,
        },
      })
    }

    map.on("zoomend", handleMove)
    map.on("dragend", handleMove)

    map.on("click", "layer", ({ features }) => {
      if (!features) {
        return
      }
      const place = JSON.parse(features[0].properties?.place) as Place | undefined
      if (place) {
        setPlacePopup(place)
      }
    })

    map.on("mouseenter", "layer", () => {
      map.getCanvas().style.cursor = "pointer"
    })

    map.on("mouseleave", "layer", () => {
      map.getCanvas().style.cursor = ""
    })

    mapRef.current = map
  })

  useEffect(() => {
    if (!mapRef.current || !loaded) {
      return
    }

    const places: Places = {}
    products.forEach((product) => {
      const id = getPlaceId(product)
      if (!places[id]) {
        places[id] = {
          coordinates: [product._geoloc.lng, product._geoloc.lat],
          products: [],
        }
      }
      places[id].products.push(product)
    })

    const source = mapRef.current.getSource(SOURCE_NAME) as GeoJSONSource
    source.setData(getFeatures(places))
  }, [products, loaded])

  useEffect(() => {
    if (!placePopup || !mapRef.current || !popupRef.current) {
      return
    }

    const popup = new mapboxgl.Popup(POPUP_OPTIONS)
      .setLngLat(placePopup.coordinates)
      .setDOMContent(popupRef.current)
      .addTo(mapRef.current)

    return () => {
      popup.remove()
    }
  }, [placePopup])

  return (
    <Container ref={containerRef}>
      {placePopup && <PlacePopup products={placePopup.products} ref={popupRef} />}
    </Container>
  )
}

export default Mapbox
