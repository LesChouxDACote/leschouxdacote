import AddIcon from "@mui/icons-material/Add"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { pipe, Result, Schema as Sc, SchemaIssue } from "effect"
import HelpLink from "src/components/HelpLink"
import Modal from "src/components/Modal"
import SlotBookings from "src/components/SlotBookings"
import SlotCard from "src/components/SlotCard"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { formatSlotDate, getSlotEnd, getSlotKey, sortSlots } from "src/helpers/date"
import type { ReservationsResponse } from "src/models/Booking"
import { Reservation, Slot, SlotSchema } from "src/pages/compte/producteur/annonce"
import type { Booking } from "src/types/model"

interface SlotsFormProps {
  productId?: string
  slots: readonly Slot[]
  setSlots: React.Dispatch<React.SetStateAction<readonly Slot[]>>
  onInvalidChange?: (invalid: boolean) => void
}

interface NewSlotValues {
  date: string
  heureDebut: string
  heureFin: string
}

const EMPTY_SLOT: NewSlotValues = { date: "", heureDebut: "", heureFin: "" }

const keyOf = (slot: Slot) => getSlotKey(slot.date, slot.heureDebut, slot.heureFin)

// Construit à l'usage : SlotSchema vient de la page, qui importe ce composant (import circulaire)
const getNewSlotSchema = () =>
  pipe(
    SlotSchema,
    Sc.check(
      Sc.makeFilter((slot) => {
        const currentDate = new Date()
        const slotDate = new Date(slot.date)
        const heureDebut = new Date(`1970-01-01T${slot.heureDebut}:00`)

        if (slotDate.toDateString() !== currentDate.toDateString() && slotDate < currentDate) {
          return "La date doit être après la date actuelle."
        }

        const now = new Date()
        const currentHour = now.toTimeString().slice(0, 5)
        const today = new Date().toISOString().split("T")[0]
        if (slotDate.toISOString().split("T")[0] === today && heureDebut < new Date(`1970-01-01T${currentHour}:00`)) {
          return "L'heure de début doit être après l'heure actuelle."
        }

        const heureFin = new Date(`1970-01-01T${slot.heureFin}:00`)

        return heureDebut < heureFin || "L'heure de début doit être avant l'heure de fin."
      }),
    ),
  )

const SlotsForm = ({ productId, setSlots, slots, onInvalidChange }: SlotsFormProps) => {
  const { loading } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])

  // Réservations des clients (réservées au producteur propriétaire), rangées par créneau
  useEffect(() => {
    if (loading || !productId) {
      return
    }
    let cancelled = false
    api
      .get<ReservationsResponse>("reservation", { productId })
      .then((data) => {
        if (!cancelled && data.owner) {
          setBookings(data.bookings ?? [])
        }
      })
      .catch(() => {
        // Réservations indisponibles : les cartes s'affichent sans la liste des clients.
      })
    return () => {
      cancelled = true
    }
  }, [loading, productId])

  const bookingsBySlot = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const booking of bookings) {
      const key = getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)
      map.set(key, [...(map.get(key) ?? []), booking])
    }
    return map
  }, [bookings])

  // Quantité modifiée par le producteur (déjà enregistrée) : le total de la carte suit
  const handleBookingUpdated = useCallback((updated: Booking) => {
    setBookings((current) => current.map((booking) => (booking.objectID === updated.objectID ? updated : booking)))
  }, [])

  const sortedSlots = sortSlots(slots)
  const now = Date.now()
  const upcomingSlots = sortedSlots.filter((slot) => getSlotEnd(slot.date, slot.heureFin) >= now)
  const pastSlots = sortedSlots.filter((slot) => getSlotEnd(slot.date, slot.heureFin) < now)
  const slotKeys = new Set(slots.map(keyOf))
  // Réservations dont le créneau n'existe plus dans l'annonce : affichées à part, en lecture seule
  const orphans = [...bookingsBySlot.entries()].filter(([key]) => !slotKeys.has(key))

  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null)
  const bookingsToDelete = slotToDelete ? (bookingsBySlot.get(keyOf(slotToDelete)) ?? []) : []

  const handleConfirmDelete = () => {
    if (slotToDelete) {
      setSlots(slots.filter((slot) => slot !== slotToDelete))
      setSlotToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setSlotToDelete(null)
  }

  const updateReservation = useCallback(
    (slotKey: string, reservation: Reservation | null) => {
      setSlots((current) => current.map((slot) => (keyOf(slot) === slotKey ? { ...slot, reservation } : slot)))
    },
    [setSlots],
  )

  // Les réglages de réservation invalides bloquent l'enregistrement de l'annonce
  const invalidSlotsRef = useRef(new Set<string>())
  const [invalidKeys, setInvalidKeys] = useState<ReadonlySet<string>>(new Set())

  const handleInvalid = useCallback((slotKey: string, invalid: boolean) => {
    if (invalid) {
      invalidSlotsRef.current.add(slotKey)
    } else {
      invalidSlotsRef.current.delete(slotKey)
    }
    setInvalidKeys(new Set(invalidSlotsRef.current))
  }, [])

  useEffect(() => {
    onInvalidChange?.(invalidKeys.size > 0)
  }, [invalidKeys, onInvalidChange])

  const { control, getValues, reset } = useForm<NewSlotValues>({ defaultValues: EMPTY_SLOT })
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Le créneau tout juste ajouté s'ouvre sur ses réglages de réservation
  const [addedKey, setAddedKey] = useState<string | null>(null)

  const handleAdd = () => {
    pipe(
      Sc.decodeUnknownResult(getNewSlotSchema())(getValues()),
      Result.mapError((error) => SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues[0].message),
      Result.flatMap((newSlot) =>
        slotKeys.has(keyOf(newSlot)) ? Result.fail("Ce créneau existe déjà.") : Result.succeed(newSlot),
      ),
      Result.match({
        onSuccess: (newSlot) => {
          setError(null)
          setSlots(sortSlots([...slots, newSlot]))
          setAddedKey(keyOf(newSlot))
          reset(EMPTY_SLOT)
          setIsAdding(false)
        },
        onFailure: setError,
      }),
    )
  }

  const handleCancelAdd = () => {
    setError(null)
    reset(EMPTY_SLOT)
    setIsAdding(false)
  }

  const renderCard = (slot: Slot) => {
    const key = keyOf(slot)
    return (
      <SlotCard
        key={key}
        slot={slot}
        slotKey={key}
        bookings={bookingsBySlot.get(key) ?? []}
        invalid={invalidKeys.has(key)}
        defaultOpen={key === addedKey}
        onDelete={setSlotToDelete}
        updateReservation={updateReservation}
        onInvalidChange={handleInvalid}
        productId={productId}
        onBookingUpdated={handleBookingUpdated}
      />
    )
  }

  return (
    <Stack spacing={2} sx={{ alignItems: "start" }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "baseline" }}>
        <Typography variant="h2" sx={{ fontSize: "25px" }}>
          Créneaux
        </Typography>
        <HelpLink slug="creneaux" />
      </Stack>

      {isAdding ? (
        <Paper variant="outlined" sx={{ width: "100%", p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Nouveau créneau</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date *"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="heureDebut"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Heure début *"
                    type="time"
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }} // step 300 = 5 min
                    sx={{ minWidth: "8rem" }}
                  />
                )}
              />
              <Controller
                name="heureFin"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Heure fin *"
                    type="time"
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                    sx={{ minWidth: "8rem" }}
                  />
                )}
              />
            </Stack>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary" onClick={handleAdd}>
                Ajouter
              </Button>
              <Button variant="outlined" onClick={handleCancelAdd}>
                Annuler
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setIsAdding(true)}>
          Ajouter un créneau
        </Button>
      )}

      {sortedSlots.length === 0 && (
        <Typography variant="body2" color="textSecondary">
          Aucun créneau pour l&apos;instant : ajoutez-en un pour proposer un retrait à vos clients.
        </Typography>
      )}

      {upcomingSlots.map(renderCard)}

      {pastSlots.length > 0 && (
        <Accordion disableGutters sx={{ width: "100%" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{`Créneaux passés (${pastSlots.length})`}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>{pastSlots.map(renderCard)}</Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {orphans.map(([key, rows]) => (
        <Paper key={key} variant="outlined" sx={{ width: "100%", p: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: "bold", "&::first-letter": { textTransform: "uppercase" } }}>
            {formatSlotDate(new Date(rows[0].slotDate), rows[0].heureDebut, rows[0].heureFin)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Ce créneau a été retiré de l&apos;annonce.
          </Typography>
          <SlotBookings bookings={rows} totalQuantity={null} />
        </Paper>
      ))}

      {slotToDelete && (
        <Modal onClose={handleCancelDelete}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Typography>
              {`Supprimer le créneau du ${formatSlotDate(slotToDelete.date, slotToDelete.heureDebut, slotToDelete.heureFin)} ?`}
            </Typography>
            {bookingsToDelete.length > 0 && (
              <Typography color="error">
                {bookingsToDelete.length > 1
                  ? `${bookingsToDelete.length} clients ont déjà réservé ce créneau.`
                  : "1 client a déjà réservé ce créneau."}
              </Typography>
            )}
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleCancelDelete}>
                Annuler
              </Button>
              <Button variant="contained" color="error" onClick={handleConfirmDelete}>
                Supprimer
              </Button>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Stack>
  )
}

export default SlotsForm
