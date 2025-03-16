import { AddCircleOutline, Close } from "@mui/icons-material"
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material"
import React from "react"
import { Controller, useForm } from "react-hook-form"

import { ParseResult, pipe, Schema as Sc, Either as E } from "effect"
import { Slot, SlotSchema } from "src/pages/compte/producteur/annonce"

interface SlotsFormProps {
  slots: readonly Slot[]
  setSlots: React.Dispatch<React.SetStateAction<readonly Slot[]>>
}

const SlotsForm = ({ setSlots, slots }: SlotsFormProps) => {
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
