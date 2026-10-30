import { Box, Button, Stack, TextField, Typography } from "@mui/material"
import { pipe, Result, Schema as Sc, SchemaIssue } from "effect"
import { useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { UNIT_LABELS } from "src/constants"
import { Reservation, ReservationSchema, Slot } from "src/pages/compte/producteur/annonce"
import type { Unit } from "src/types/model"

interface ReservationBlockProps {
  slot: Slot
  slotKey: string
  updateReservation: (slotKey: string, reservation: Reservation | null) => void
  onInvalidChange?: (slotKey: string, invalid: boolean) => void
}

const decodeReservation = (totalQuantity: string, maxQuantityPerPerson: string, instructions: string) =>
  pipe(
    Sc.decodeUnknownResult(
      pipe(
        ReservationSchema,
        Sc.check(
          Sc.makeFilter((reservation) => {
            if (!Number.isFinite(reservation.totalQuantity) || reservation.totalQuantity <= 0) {
              return "Indiquez un stock supérieur à 0."
            }
            if (
              reservation.maxQuantityPerPerson != null &&
              reservation.maxQuantityPerPerson > reservation.totalQuantity
            ) {
              return "La quantité maximale par personne dépasse le stock."
            }
            return true
          }),
        ),
      ),
    )({
      totalQuantity: Number(totalQuantity),
      maxQuantityPerPerson: maxQuantityPerPerson === "" ? null : Number(maxQuantityPerPerson),
      instructions: instructions || null,
    }),
    Result.mapError((error) => SchemaIssue.makeFormatterStandardSchemaV1()(error.issue).issues[0].message),
  )

// Réglages de réservation d'un créneau : chaque saisie valide est écrite tout de suite dans le
// créneau (enregistré avec l'annonce) ; une saisie invalide reste dans le bloc et est signalée.
const ReservationBlock = ({ slot, slotKey, updateReservation, onInvalidChange }: ReservationBlockProps) => {
  const { watch } = useFormContext()
  const unit = watch("unit") as Unit | null | undefined

  const [isOpen, setIsOpen] = useState(Boolean(slot.reservation))
  const [totalQuantity, setTotalQuantity] = useState(slot.reservation ? String(slot.reservation.totalQuantity) : "")
  const [maxQuantityPerPerson, setMaxQuantityPerPerson] = useState(
    slot.reservation?.maxQuantityPerPerson != null ? String(slot.reservation.maxQuantityPerPerson) : "",
  )
  const [instructions, setInstructions] = useState(slot.reservation?.instructions ?? "")

  const result = decodeReservation(totalQuantity, maxQuantityPerPerson, instructions)
  const error = isOpen && Result.isFailure(result) ? result.failure : null

  useEffect(() => {
    onInvalidChange?.(slotKey, error != null)
    // À l'unmount (suppression du créneau), on retire le marquage de ce bloc
    return () => onInvalidChange?.(slotKey, false)
  }, [error, slotKey, onInvalidChange])

  const handleChange = (total: string, max: string, text: string) => {
    setTotalQuantity(total)
    setMaxQuantityPerPerson(max)
    setInstructions(text)
    const next = decodeReservation(total, max, text)
    if (Result.isSuccess(next)) {
      updateReservation(slotKey, next.success)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTotalQuantity("")
    setMaxQuantityPerPerson("")
    setInstructions("")
    updateReservation(slotKey, null)
  }

  if (!isOpen) {
    return (
      <Button variant="outlined" color="primary" onClick={handleOpen}>
        Configurer la réservation
      </Button>
    )
  }

  return (
    <Stack spacing={1.5} sx={{ alignItems: "start", width: "100%" }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", width: "100%" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            label="Stock disponible *"
            type="number"
            slotProps={{ htmlInput: { step: 1 } }}
            value={totalQuantity}
            onChange={(event) => handleChange(event.target.value, maxQuantityPerPerson, instructions)}
            error={error != null}
            fullWidth
          />
        </Box>
        {unit && <Typography variant="body1">{UNIT_LABELS[unit]}</Typography>}
      </Stack>
      <Typography variant="body2" color="textSecondary">
        Quand ce stock est atteint, plus personne ne peut réserver ce créneau.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center", width: "100%" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TextField
            label="Quantité maximale par personne"
            type="number"
            slotProps={{ htmlInput: { step: 1 } }}
            value={maxQuantityPerPerson}
            onChange={(event) => handleChange(totalQuantity, event.target.value, instructions)}
            fullWidth
          />
        </Box>
        {unit && <Typography variant="body1">{UNIT_LABELS[unit]}</Typography>}
      </Stack>
      <Typography variant="body2" color="textSecondary">
        Laissez vide pour ne pas fixer de limite.
      </Typography>

      <TextField
        label="Informations et consignes pour les clients"
        multiline
        minRows={2}
        fullWidth
        value={instructions}
        onChange={(event) => handleChange(totalQuantity, maxQuantityPerPerson, event.target.value)}
      />

      {!unit && (
        <Typography variant="body2" color="error">
          Veuillez renseigner l&apos;unité du produit pour activer cette réservation.
        </Typography>
      )}

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      <Button variant="outlined" color="error" onClick={handleClose}>
        Annuler la réservation
      </Button>
    </Stack>
  )
}

export default ReservationBlock
