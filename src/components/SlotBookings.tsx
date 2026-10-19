import styled from "@emotion/styled"
import { Button } from "@mui/material"
import { useState } from "react"
import { Text } from "src/components/Text"
import { COLORS, SIZES } from "src/constants"
import { formatDate } from "src/helpers/date"
import type { Booking } from "src/types/model"

interface SlotBookingsProps {
  bookings: readonly Booking[]
  totalQuantity: number | null
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

// Réservations des clients sur un créneau, repliées derrière « Voir les N réservations ».
const SlotBookings = ({ bookings, totalQuantity }: SlotBookingsProps) => {
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
                  <tr key={booking.objectID}>
                    <td>{rowIndex + 1}</td>
                    <td>{`${booking.firstname} ${booking.lastname}`}</td>
                    <td>{formatDate(booking.created, "dd/MM/yyyy")}</td>
                    <td>{booking.phone}</td>
                    <td>{booking.email}</td>
                    <td>{booking.quantity}</td>
                  </tr>
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
