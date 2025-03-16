import { AddCircleOutline, Close } from "@mui/icons-material"
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material"
import React from "react"
import { Controller, useForm } from "react-hook-form"

import { ParseResult, pipe, Schema as Sc, Either as E } from "effect"

const SlotSchema = Sc.Struct({
  date: Sc.Date.annotations({
    message: () => "Veuillez entrer une date.",
    override: true,
  }).pipe(Sc.filter((date) => date >= new Date() || "La date doit être dans le futur")),
  heureDebut: Sc.String,
  heureFin: Sc.String,
}).pipe(
  Sc.filter((slot) => {
    const heureDebut = new Date(`1970-01-01T${slot.heureDebut}:00`)
    const heureFin = new Date(`1970-01-01T${slot.heureFin}:00`)
    return heureDebut < heureFin || "L'heure de début doit être avant l'heure de fin"
  }),
)

type Slot = typeof SlotSchema.Type

const SlotsForm = () => {
  const { control } = useForm()

  const [slots, setSlots] = React.useState<Slot[]>([])
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
                setSlots((prevSlots) => prevSlots.filter((_, index) => index !== 0))
              }}
            >
              <Close color="error" />
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
                Sc.decodeUnknownEither(SlotSchema)({
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
            <AddCircleOutline />
          </Button>
        </Box>
      </Stack>
    </Stack>
  )
}

export default SlotsForm
