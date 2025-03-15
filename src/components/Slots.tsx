import { AddCircleOutline, Close } from "@mui/icons-material"
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material"
import React from "react"
import { Controller, useForm } from "react-hook-form"

interface Slot {
  date: Date
  heureDebut: string
  heureFin: string
}

const SlotsForm = () => {
  const { control } = useForm()

  const [slots, setSlots] = React.useState<Slot[]>([])

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
              console.log("click", control._formValues)
              const newSlot = {
                date: new Date(control._formValues.date),
                heureDebut: control._formValues.heureDebut,
                heureFin: control._formValues.heureFin,
              }
              setSlots([...slots, newSlot])
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
