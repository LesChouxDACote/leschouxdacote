import { RemoveCircle } from "@mui/icons-material"
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material"
import React, { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { Either as E, ParseResult, pipe, Schema as Sc } from "effect"
import { Slot, SlotSchema } from "src/pages/compte/producteur/annonce"
import Modal from "src/components/Modal"

interface SlotsFormProps {
  slots: readonly Slot[]
  setSlots: React.Dispatch<React.SetStateAction<readonly Slot[]>>
}

const SlotsForm = ({ setSlots, slots }: SlotsFormProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null)

  const handleDeleteClick = (slot: Slot) => {
    setSlotToDelete(slot)
    setIsModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (slotToDelete) {
      setSlots(slots.filter((slot) => slot !== slotToDelete))
      setIsModalOpen(false)
      setSlotToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setIsModalOpen(false)
    setSlotToDelete(null)
  }

  const { control } = useForm()

  const [error, setError] = React.useState<string | null>(null)

  return (
    <Stack spacing={2} alignItems="start">
      <h2>Créneaux</h2>

      {slots.map((slot, index) => (
        <Stack direction="row" spacing={2} alignItems="center" width="100%" mb={2} key={index}>
          <Box width="37%">
            <Typography variant="body1">{`Le ${slot.date.toLocaleDateString()}`}</Typography>
          </Box>
          <Box width="23%" paddingLeft={"6px"}>
            <Typography variant="body1">{` de ${slot.heureDebut}`}</Typography>
          </Box>
          <Box width="23%" paddingLeft={"6px"}>
            <Typography variant="body1">{`à ${slot.heureFin}`}</Typography>
          </Box>
          <Box width="17%">
            <IconButton
              onClick={() => {
                handleDeleteClick(slot)
              }}
            >
              <RemoveCircle color="error" />
            </IconButton>
          </Box>
        </Stack>
      ))}
      {error && (
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      )}

      <Stack direction="row" spacing={2} alignItems="center" width={"100%"}>
        <Box width="37%">
          <Controller
            name="date"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField {...field} label="Date *" type="date" InputLabelProps={{ shrink: true }} />
            )}
          />
        </Box>
        <Box width="23%">
          <Controller
            name="heureDebut"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label="Heure début *"
                type="time"
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: "5rem" }}
                InputProps={{
                  inputProps: {
                    step: 300, // 5 min
                  },
                }}
              />
            )}
          />
        </Box>
        <Box width="23%">
          <Controller
            name="heureFin"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label="Heure fin *"
                type="time"
                InputLabelProps={{ shrink: true }}
                style={{ minWidth: "5rem" }}
              />
            )}
          />
        </Box>
        <Box width="17%">
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              pipe(
                Sc.decodeUnknownEither(
                  pipe(
                    SlotSchema,
                    Sc.filter((slot) => {
                      const currentDate = new Date()
                      const slotDate = new Date(slot.date)
                      const heureDebut = new Date(`1970-01-01T${slot.heureDebut}:00`)
                      console.log(slotDate, currentDate, heureDebut)
                      if (slotDate.toDateString() !== currentDate.toDateString() && slotDate < currentDate) {
                        return "La date doit être après la date actuelle."
                      }

                      const now = new Date()
                      const currentHour = now.toTimeString().slice(0, 5)
                      if (heureDebut < new Date(`1970-01-01T${currentHour}:00`)) {
                        return "L'heure de début doit être après l'heure actuelle."
                      }

                      const heureFin = new Date(`1970-01-01T${slot.heureFin}:00`)

                      return heureDebut < heureFin || "L'heure de début doit être avant l'heure de fin."
                    }),
                  ),
                )({
                  date: control._formValues.date,
                  heureDebut: control._formValues.heureDebut,
                  heureFin: control._formValues.heureFin,
                }),

                E.map((newSlot) => {
                  setError(null)
                  setSlots([...slots, newSlot])
                }),

                E.mapLeft((error) => ParseResult.ArrayFormatter.formatErrorSync(error)),
                E.mapLeft((error) => setError(error[0].message)),
              )
            }}
          >
            Valider
          </Button>
        </Box>
        {isModalOpen && slotToDelete && (
          <Modal onClose={handleCancelDelete}>
            <>
              <p>{`Supprimer le créneau du ${slotToDelete.date.toLocaleDateString()} de ${slotToDelete.heureDebut} à ${slotToDelete.heureFin} ?`}</p>
              <Button color="error" onClick={handleCancelDelete}>
                Non
              </Button>
              <Button onClick={handleConfirmDelete}>Oui</Button>
            </>
          </Modal>
        )}
      </Stack>
    </Stack>
  )
}

export default SlotsForm
