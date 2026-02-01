import { Button, Stack, TextField, Typography } from "@mui/material"
import React, { useState } from "react"
import { Slot } from "src/pages/compte/producteur/annonce"

interface ReservationFormProps {
  slot: Slot
  onSave: (reservationDetails: Partial<Slot>) => void
  onDelete: () => void
  onCancel?: () => void
  isCreating: boolean
}

const ReservationForm = ({ slot, onSave, onDelete, onCancel, isCreating }: ReservationFormProps) => {
  const [instructions, setInstructions] = useState(slot.reservation_instructions || "")
  const [totalQuantity, setTotalQuantity] = useState(String(slot.reservation_total_quantity || ""))
  const [maxQuantityPerUser, setMaxQuantityPerUser] = useState(String(slot.reservation_max_quantity_per_user || ""))
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    const totalQuantityNumber = Number(totalQuantity)
    if (isNaN(totalQuantityNumber) || totalQuantityNumber <= 0) {
      setError("La quantité totale doit être un nombre positif.")
      return
    }

    const maxQuantityPerUserNumber = Number(maxQuantityPerUser)
    if (maxQuantityPerUser && (isNaN(maxQuantityPerUserNumber) || maxQuantityPerUserNumber <= 0)) {
      setError("La quantité maximale par personne doit être un nombre positif.")
      return
    }

    if (maxQuantityPerUser && maxQuantityPerUserNumber > totalQuantityNumber) {
      setError("La quantité maximale par personne ne peut pas être supérieure à la quantité totale.")
      return
    }

    setError(null)
    onSave({
      reservation_instructions: instructions,
      reservation_total_quantity: totalQuantityNumber,
      reservation_max_quantity_per_user: maxQuantityPerUserNumber || undefined,
    })
  }

  return (
    <Stack spacing={2} mt={2}>
      <Typography variant="h6">Informations et instructions</Typography>
      <TextField
        multiline
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Informations et instructions"
        fullWidth
      />
      <Typography variant="h6">Stock</Typography>
      <TextField
        required
        type="number"
        label="Quantité totale *"
        value={totalQuantity}
        onChange={(e) => setTotalQuantity(e.target.value)}
      />
      <Typography variant="caption">
        Au bout de {totalQuantity || "X"} quantités réservées, la réservation ne sera plus possible.
      </Typography>
      <TextField
        type="number"
        label="Quantité réservable maximale par personne"
        value={maxQuantityPerUser}
        onChange={(e) => setMaxQuantityPerUser(e.target.value)}
      />
      <Typography variant="caption">Si ce champ n’est pas rempli, il n’y pas de limite maximale.</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Valider
        </Button>
        {isCreating ? (
          <Button variant="outlined" onClick={onCancel}>
            Annuler
          </Button>
        ) : (
          <Button variant="outlined" color="error" onClick={onDelete}>
            Supprimer cette réservation
          </Button>
        )}
      </Stack>
    </Stack>
  )
}

export default ReservationForm
