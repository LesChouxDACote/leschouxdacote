import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import { Chip, Collapse, IconButton, Paper, Stack, Typography } from "@mui/material"
import { useState } from "react"
import ReservationBlock from "src/components/Reservation"
import SlotBookings from "src/components/SlotBookings"
import { formatSlotDate, getSlotEnd } from "src/helpers/date"
import { Reservation, Slot } from "src/pages/compte/producteur/annonce"
import type { Booking } from "src/types/model"

interface SlotCardProps {
  slot: Slot
  slotKey: string
  bookings: readonly Booking[]
  invalid: boolean
  defaultOpen?: boolean
  onDelete: (slot: Slot) => void
  updateReservation: (slotKey: string, reservation: Reservation | null) => void
  onInvalidChange: (slotKey: string, invalid: boolean) => void
}

// Carte d'un créneau : date et état de la réservation en en-tête, réglages repliables (restés montés
// une fois repliés pour garder la saisie en cours) et réservations des clients.
const SlotCard = ({
  slot,
  slotKey,
  bookings,
  invalid,
  defaultOpen = false,
  onDelete,
  updateReservation,
  onInvalidChange,
}: SlotCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const booked = bookings.reduce((sum, booking) => sum + booking.quantity, 0)
  // Créneau passé : bilan neutre, la réservation n'est plus ouverte
  const isPast = getSlotEnd(slot.date, slot.heureFin) < Date.now()
  const status = slot.reservation
    ? isPast
      ? `Réservation ${booked} / ${slot.reservation.totalQuantity} réservés`
      : `Réservation ouverte · ${booked} / ${slot.reservation.totalQuantity} réservés`
    : "Sans réservation"

  return (
    <Paper variant="outlined" sx={{ width: "100%", p: 2, borderColor: invalid ? "error.main" : undefined }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "start", sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold", "&::first-letter": { textTransform: "uppercase" } }}>
          {formatSlotDate(slot.date, slot.heureDebut, slot.heureFin)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={invalid ? "Réglages à corriger" : status}
            color={invalid ? "error" : slot.reservation && !isPast ? "success" : "default"}
            variant={(slot.reservation && !isPast) || invalid ? "filled" : "outlined"}
          />
          <IconButton
            aria-label={isOpen ? "Replier les réglages" : "Modifier le créneau"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            <EditIcon />
          </IconButton>
          <IconButton aria-label="Supprimer le créneau" onClick={() => onDelete(slot)}>
            <DeleteIcon color="error" />
          </IconButton>
        </Stack>
      </Stack>
      <Collapse in={isOpen || invalid}>
        <Stack sx={{ pt: 2 }}>
          <ReservationBlock
            slot={slot}
            slotKey={slotKey}
            updateReservation={updateReservation}
            onInvalidChange={onInvalidChange}
          />
        </Stack>
      </Collapse>
      <SlotBookings bookings={bookings} totalQuantity={slot.reservation?.totalQuantity ?? null} />
    </Paper>
  )
}

export default SlotCard
