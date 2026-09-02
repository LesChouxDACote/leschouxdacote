import { Box, Button, Stack, TextField, Typography } from "@mui/material"
import { Either as E, ParseResult, pipe, Schema as Sc } from "effect"
import React, { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Reservation, ReservationSchema, Slot } from "src/pages/compte/producteur/annonce"
import type { Unit } from "src/types/model"

const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  l: "litre(s)",
  u: "pièce(s)",
}

interface ReservationBlockProps {
  slot: Slot
  index: number
  slots: readonly Slot[]
  setSlots: React.Dispatch<React.SetStateAction<readonly Slot[]>>
}

const ReservationBlock = ({ slot, index, slots, setSlots }: ReservationBlockProps) => {
  const { watch } = useFormContext()
  const unit = watch("unit") as Unit | null | undefined

  const [isOpen, setIsOpen] = useState(Boolean(slot.reservation))
  const [totalQuantity, setTotalQuantity] = useState(slot.reservation ? String(slot.reservation.totalQuantity) : "")
  const [maxQuantityPerPerson, setMaxQuantityPerPerson] = useState(
    slot.reservation?.maxQuantityPerPerson != null ? String(slot.reservation.maxQuantityPerPerson) : "",
  )
  const [instructions, setInstructions] = useState(slot.reservation?.instructions ?? "")
  const [error, setError] = useState<string | null>(null)

  const updateSlot = (reservation: Reservation | null) => {
    setSlots(slots.map((s, i) => (i === index ? { ...s, reservation } : s)))
  }

  const handleCreate = () => {
    setIsOpen(true)
  }

  const handleDelete = () => {
    setIsOpen(false)
    setTotalQuantity("")
    setMaxQuantityPerPerson("")
    setInstructions("")
    setError(null)
    updateSlot(null)
  }

  const handleValidate = () => {
    pipe(
      Sc.decodeUnknownEither(
        pipe(
          ReservationSchema,
          Sc.filter((reservation) => {
            if (!Number.isFinite(reservation.totalQuantity) || reservation.totalQuantity <= 0) {
              return "La quantité totale doit être supérieur à 0."
            }
            if (
              reservation.maxQuantityPerPerson != null &&
              reservation.maxQuantityPerPerson > reservation.totalQuantity
            ) {
              return "La quantité max/personne dépasse la quantité totale."
            }
            return true
          }),
        ),
      )({
        totalQuantity: Number(totalQuantity),
        maxQuantityPerPerson: maxQuantityPerPerson === "" ? null : Number(maxQuantityPerPerson),
        instructions: instructions || null,
      }),

      E.map((reservation) => {
        setError(null)
        updateSlot(reservation)
      }),

      E.mapLeft((error) => ParseResult.ArrayFormatter.formatErrorSync(error)),
      E.mapLeft((error) => setError(error[0].message)),
    )
  }

  return (
    <Stack spacing={1} alignItems="start" width="100%" mb={2}>
      <Typography variant="h6">Stock</Typography>

      {!isOpen && (
        <Button variant="contained" color="primary" onClick={handleCreate}>
          Créer une réservation
        </Button>
      )}

      {isOpen && (
        <>
          <Box>
            <TextField
              label="Quantité totale *"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={totalQuantity}
              onChange={(event) => setTotalQuantity(event.target.value)}
            />
          </Box>
          <Typography variant="body2" color="textSecondary">
            {`Au bout de ${totalQuantity || 0} quantités réservées, la réservation ne sera plus possible.`}
          </Typography>

          <Box>
            <TextField
              label="Quantité réservable maximale par personne"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={maxQuantityPerPerson}
              onChange={(event) => setMaxQuantityPerPerson(event.target.value)}
            />
          </Box>
          <Typography variant="body2" color="textSecondary">
            Si ce champ n&apos;est pas rempli, il n&apos;y a pas de limite maximale.
          </Typography>

          {unit ? (
            <Typography variant="body2">Unité : {UNIT_LABELS[unit]}</Typography>
          ) : (
            <Typography variant="body2" color="error">
              Veuillez renseigner l&apos;unité du produit ci-dessus pour activer cette réservation.
            </Typography>
          )}

          <TextField
            label="Informations et instructions"
            multiline
            fullWidth
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="primary" onClick={handleValidate}>
              Valider
            </Button>
            <Button variant="outlined" color="error" onClick={handleDelete}>
              Supprimer cette réservation
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  )
}

export default ReservationBlock
