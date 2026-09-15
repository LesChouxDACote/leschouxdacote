import styled from "@emotion/styled"
import { useEffect, useMemo, useState } from "react"
import type { ReservableSlot } from "src/components/ReservationSection"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, SIZES } from "src/constants"
import { useUser } from "src/helpers/auth"
import { formatDate, getSlotEnd, getSlotKey } from "src/helpers/date"
import api from "src/helpers/api"
import type { ReservationsResponse } from "src/models/Booking"
import type { Booking } from "src/types/model"

interface MyReservationsProps {
  productId: string
  producerUid: string
  slots: readonly ReservableSlot[]
}

interface SlotGroup {
  title: string
  hours: string
  rows: Booking[]
  total: number
  totalQuantity: number | null
  isPast: boolean
}

const formatHours = (heure: string) => heure.replace(":", "h")

const Section = styled.section`
  position: relative;
  background-color: ${COLORS.odd};
  border: 1px solid ${COLORS.border};
  border-radius: 6px;
  padding: 20px 25px;
  margin-top: 30px;

  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 20px 15px;
  }
`

const SectionTitle = styled.h3`
  margin: 0 0 15px;
  font-size: ${SIZES.large}px;
  font-weight: bold;
`

const Group = styled.div<{ $past?: boolean }>`
  ${({ $past }) => $past && `color: ${COLORS.grey};`}

  & + & {
    margin-top: 30px;
  }
`

const GroupTitle = styled.h4`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 0 0 15px;
  font-weight: bold;
`

const TableWrapper = styled.div`
  overflow-x: auto;
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

const MyReservations = ({ productId, producerUid, slots }: MyReservationsProps) => {
  const { authUser } = useUser()
  const [response, setResponse] = useState<ReservationsResponse | null>(null)
  const isOwner = authUser?.uid === producerUid

  useEffect(() => {
    if (!isOwner) {
      return
    }
    let cancelled = false
    api
      .get<ReservationsResponse>("reservation", { productId })
      .then((data) => {
        if (!cancelled) {
          setResponse(data)
        }
      })
      .catch(() => {
        // Totaux et réservations indisponibles : la section reste vide.
      })
    return () => {
      cancelled = true
    }
  }, [isOwner, productId])

  const groups = useMemo<SlotGroup[]>(() => {
    const bookings = response?.bookings ?? []

    const groups: SlotGroup[] = slots.map((slot) => {
      const rows = bookings.filter(
        (booking) =>
          booking.slotDate === slot.date.getTime() &&
          booking.heureDebut === slot.heureDebut &&
          booking.heureFin === slot.heureFin,
      )
      return {
        title: formatDate(slot.date),
        hours: `${formatHours(slot.heureDebut)} - ${formatHours(slot.heureFin)}`,
        rows,
        total: rows.reduce((sum, booking) => sum + booking.quantity, 0),
        totalQuantity: slot.reservation.totalQuantity,
        isPast: getSlotEnd(slot.date, slot.heureFin) < Date.now(),
      }
    })

    // Réservations dont le créneau a été supprimé de l'annonce depuis : regroupées entre elles,
    // sans quantité totale de référence.
    const grouped = new Set(groups.flatMap((group) => group.rows))
    const orphans = new Map<string, Booking[]>()
    for (const booking of bookings) {
      if (!grouped.has(booking)) {
        const key = getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)
        const rows = orphans.get(key) ?? []
        rows.push(booking)
        orphans.set(key, rows)
      }
    }
    orphans.forEach((rows) => {
      groups.push({
        title: formatDate(new Date(rows[0].slotDate)),
        hours: `${formatHours(rows[0].heureDebut)} - ${formatHours(rows[0].heureFin)}`,
        rows,
        total: rows.reduce((sum, booking) => sum + booking.quantity, 0),
        totalQuantity: null,
        isPast: getSlotEnd(new Date(rows[0].slotDate), rows[0].heureFin) < Date.now(),
      })
    })

    return groups
  }, [response, slots])

  if (!isOwner || !response?.bookings) {
    return null
  }

  return (
    <Section>
      <SectionTitle>Mes réservations</SectionTitle>
      {groups.map((group, index) => (
        <Group key={index} $past={group.isPast}>
          <GroupTitle>
            <span>{group.title}</span>
            <span>{group.hours}</span>
          </GroupTitle>
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
                {group.rows.map((booking, rowIndex) => (
                  <tr key={booking.objectID}>
                    <td>{rowIndex + 1}</td>
                    <td>{`${booking.firstname} ${booking.lastname}`}</td>
                    <td>{formatDate(booking.created, "dd/MM/yyyy")}</td>
                    <td>{booking.phone}</td>
                    <td>{booking.email}</td>
                    <td>{booking.quantity}</td>
                  </tr>
                ))}
                {group.rows.length === 0 && (
                  <tr>
                    <td colSpan={6}>Aucune réservation</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableWrapper>
          <Total $size={SIZES.card}>
            {group.totalQuantity != null
              ? `Total réservé : ${group.total} / ${group.totalQuantity}`
              : `Total réservé : ${group.total}`}
          </Total>
        </Group>
      ))}
    </Section>
  )
}

export default MyReservations
