import styled from "@emotion/styled"
import { Button, Divider, Stack, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { ValidationError } from "src/components/Form"
import { Text } from "src/components/Text"
import { SIZES } from "src/constants"
import api from "src/helpers/api"
import { formatDate } from "src/helpers/date"
import type { Booking } from "src/types/model"

interface SlotBookingsProps {
  bookings: readonly Booking[]
  totalQuantity: number | null
  productId?: string
  editable?: boolean
  onBookingUpdated?: (booking: Booking) => void
}

interface BookingItemProps {
  booking: Booking
  rowIndex: number
  productId?: string
  editable: boolean
  onBookingUpdated?: (booking: Booking) => void
}

const Total = styled(Text)`
  display: block;
  margin-top: 10px;
`

// Fiche d'un client (tient dans la largeur de la carte, sans tableau) : sur un créneau à venir, le
// producteur peut modifier la quantité réservée, enregistrée aussitôt (indépendamment de l'annonce).
const BookingItem = ({ booking, rowIndex, productId, editable, onBookingUpdated }: BookingItemProps) => {
  const [value, setValue] = useState(String(booking.quantity))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [updated, setUpdated] = useState(false)
  const changed = value !== String(booking.quantity)

  const handleCancel = () => {
    setValue(String(booking.quantity))
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const quantity = Number(value)
      await api.patch("reservation", { productId, bookingId: booking.objectID, quantity })
      onBookingUpdated?.({ ...booking, quantity })
      setUpdated(true)
    } catch (err) {
      setError(
        err instanceof ValidationError ? err.message : "Une erreur est survenue, la quantité n'a pas été modifiée.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold", overflowWrap: "anywhere" }}>
          {`${rowIndex + 1}. ${booking.firstname} ${booking.lastname}`}
        </Typography>
        {editable ? (
          <TextField
            size="small"
            type="number"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError(null)
              setUpdated(false)
            }}
            error={error != null}
            slotProps={{ htmlInput: { min: 1, step: 1, "aria-label": "Quantité réservée" } }}
            sx={{ width: "6rem" }}
          />
        ) : (
          <Typography variant="body1">{`Quantité : ${booking.quantity}`}</Typography>
        )}
      </Stack>
      <Typography variant="body2" color="textSecondary" sx={{ overflowWrap: "anywhere" }}>
        {[booking.phone, booking.email, `réservé le ${formatDate(booking.created, "dd/MM/yyyy")}`].join(" · ")}
      </Typography>
      {(error || changed || (updated && !changed)) && (
        <Stack spacing={1} sx={{ alignSelf: { xs: "stretch", sm: "end" }, alignItems: { xs: "start", sm: "end" } }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          {changed && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" disabled={saving} onClick={handleSave}>
                {saving ? "Chargement…" : "Enregistrer"}
              </Button>
              <Button size="small" variant="outlined" disabled={saving} onClick={handleCancel}>
                Annuler
              </Button>
            </Stack>
          )}
          {updated && !changed && (
            <Typography variant="body2" color="warning.main">
              Pensez à prévenir cet acheteur que vous avez modifié sa réservation.
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  )
}

// Réservations des clients sur un créneau, repliées derrière « Voir les N réservations ».
const SlotBookings = ({
  bookings,
  totalQuantity,
  productId,
  editable = false,
  onBookingUpdated,
}: SlotBookingsProps) => {
  const [isOpen, setIsOpen] = useState(false)

  if (bookings.length === 0) {
    return null
  }

  const total = bookings.reduce((sum, booking) => sum + booking.quantity, 0)
  const label = bookings.length > 1 ? `Voir les ${bookings.length} réservations` : "Voir les réservations"

  return (
    <div>
      <Button variant="text" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        {isOpen ? "Masquer" : label}
      </Button>
      {isOpen && (
        <>
          <Stack spacing={1.5} divider={<Divider flexItem />} sx={{ mt: 1 }}>
            {bookings.map((booking, rowIndex) => (
              <BookingItem
                key={booking.objectID}
                booking={booking}
                rowIndex={rowIndex}
                productId={productId}
                editable={editable}
                onBookingUpdated={onBookingUpdated}
              />
            ))}
          </Stack>
          <Total $size={SIZES.card}>
            {totalQuantity != null ? `Total réservé : ${total} / ${totalQuantity}` : `Total réservé : ${total}`}
          </Total>
        </>
      )}
    </div>
  )
}

export default SlotBookings
