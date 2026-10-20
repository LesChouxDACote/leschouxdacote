import styled from "@emotion/styled"
import { Button, Stack, TextField, Typography } from "@mui/material"
import { useState } from "react"
import { ValidationError } from "src/components/Form"
import { Text } from "src/components/Text"
import { COLORS, SIZES } from "src/constants"
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

interface BookingRowProps {
  booking: Booking
  rowIndex: number
  productId?: string
  editable: boolean
  onBookingUpdated?: (booking: Booking) => void
}

const TableWrapper = styled.div`
  overflow-x: auto;
  margin-top: 10px;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    border: 1px solid ${COLORS.border};
    padding: 8px 12px;
    text-align: left;
    font-weight: normal;
  }

  th {
    font-weight: bold;
  }

  td:first-of-type {
    width: 30px;
    text-align: center;
  }
`

const Total = styled(Text)`
  display: block;
  margin-top: 10px;
`

// Ligne d'un client : sur un créneau à venir, le producteur peut modifier la quantité réservée,
// enregistrée aussitôt (indépendamment de l'annonce).
const BookingRow = ({ booking, rowIndex, productId, editable, onBookingUpdated }: BookingRowProps) => {
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
    <>
      <tr>
        <td>{rowIndex + 1}</td>
        <td>{`${booking.firstname} ${booking.lastname}`}</td>
        <td>{formatDate(booking.created, "dd/MM/yyyy")}</td>
        <td>{booking.phone}</td>
        <td>{booking.email}</td>
        <td>
          {editable ? (
            <Stack spacing={1} sx={{ alignItems: "start" }}>
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
            </Stack>
          ) : (
            booking.quantity
          )}
        </td>
      </tr>
      {updated && !changed && (
        <tr>
          <td colSpan={6}>
            <Typography variant="body2" color="warning.main">
              Pensez à prévenir cet acheteur que vous avez modifié sa réservation.
            </Typography>
          </td>
        </tr>
      )}
    </>
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
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th aria-label="Numéro" />
                  <th>Prénom Nom</th>
                  <th>Date de réservation</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Quantité</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, rowIndex) => (
                  <BookingRow
                    key={booking.objectID}
                    booking={booking}
                    rowIndex={rowIndex}
                    productId={productId}
                    editable={editable}
                    onBookingUpdated={onBookingUpdated}
                  />
                ))}
              </tbody>
            </Table>
          </TableWrapper>
          <Total $size={SIZES.card}>
            {totalQuantity != null ? `Total réservé : ${total} / ${totalQuantity}` : `Total réservé : ${total}`}
          </Total>
        </>
      )}
    </div>
  )
}

export default SlotBookings
