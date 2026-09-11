import styled from "@emotion/styled"
import { Close } from "@mui/icons-material"
import { Button, IconButton, TextField, Typography } from "@mui/material"
import { useRouter } from "next/router"
import { useEffect, useMemo, useState } from "react"
import { ValidationError, number, object, string } from "yup"
import { Button as GreenButton } from "src/components/Button"
import { UNIT_LABELS } from "src/components/Reservation"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, SIZES } from "src/constants"
import { useUser } from "src/helpers/auth"
import { validatePhoneNumber } from "src/helpers/validators"
import type { Reservation } from "src/pages/compte/producteur/annonce"
import type { Unit } from "src/types/model"

export interface ReservableSlot {
  date: Date
  heureDebut: string
  heureFin: string
  reservation: Reservation
}

interface ReservationErrors {
  slot?: string
  quantity?: string
  phone?: string
  email?: string
}

const MAX_QUANTITY = Number.MAX_SAFE_INTEGER

// La date d'un créneau est à minuit UTC (input date "YYYY-MM-DD") : un créneau reste affichable
// jusqu'à sa fin réelle (date + heure de fin), et pas seulement jusqu'à minuit.
const getSlotEnd = (slot: ReservableSlot) => {
  const day = slot.date.toISOString().slice(0, 10)
  return new Date(`${day}T${slot.heureFin}`).getTime()
}

const getValidationSchema = (maxQuantityPerPerson: number | null | undefined, unitLabel: string) =>
  object().shape({
    quantity: number()
      .typeError("La quantité doit être un nombre")
      .integer("La quantité doit être un nombre entier")
      .positive("La quantité doit être supérieure à 0")
      .required("La quantité est obligatoire")
      .max(
        maxQuantityPerPerson ?? MAX_QUANTITY,
        maxQuantityPerPerson != null
          ? `La quantité ne peut pas dépasser ${maxQuantityPerPerson} ${unitLabel}`.trim()
          : "La quantité est trop grande",
      ),
    phone: string()
      .required("Le téléphone est obligatoire")
      .test("is-valid-phone", "Désolé, le numéro de téléphone est invalide", (value) =>
        value ? validatePhoneNumber(value) === true : false,
      ),
    email: string().required("L'e-mail est obligatoire").email("Adresse e-mail invalide"),
  })

const TriggerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
`

const TriggerButton = styled(GreenButton)`
  min-width: 250px;

  @media (max-width: ${LAYOUT.mobile}px) {
    width: 100%;
  }
`

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

const Instructions = styled(Text)`
  font-style: italic;
  margin-bottom: 15px;
`

const SlotsLabel = styled.div`
  font-weight: bold;
  margin-bottom: 10px;
`

const SlotsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const SlotButton = styled(Button)<{ $selected?: boolean }>`
  ${({ $selected }) => $selected && `box-shadow: inset 0 0 0 3px ${COLORS.dark};`}
`

const FieldsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;

  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SlotError = styled(Text)`
  color: ${COLORS.red};
  margin-top: 10px;
`

const ActionsRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 25px;
`

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 8px;
  right: 8px;
`

interface ReservationSectionProps {
  slots: readonly ReservableSlot[]
  unit: Unit | null
}

const ReservationSection = ({ slots, unit }: ReservationSectionProps) => {
  const { authUser, loading } = useUser()
  const { asPath, replace } = useRouter()

  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ReservableSlot | null>(null)
  const [quantity, setQuantity] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<ReservationErrors>({})
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  // La page est générée statiquement : l'heure courante n'est connue qu'une fois la page chargée
  // dans le navigateur. On ne rend donc rien avant, pour éviter que le bouton « Réserver »
  // n'apparaisse un instant puis ne disparaisse au chargement.
  const upcomingSlots = useMemo(
    () => (now === null ? [] : slots.filter((slot) => getSlotEnd(slot) >= now)),
    [slots, now],
  )

  if (now === null || upcomingSlots.length === 0) {
    return null
  }

  const instructions = (selectedSlot ?? upcomingSlots[0])?.reservation.instructions ?? null

  const handleOpen = () => {
    if (loading) {
      return
    }
    if (!authUser) {
      replace("/connexion?next=" + asPath)
      return
    }
    setEmail((current) => current || authUser.email)
    setOpen(true)
  }

  const handleCancel = () => {
    setSelectedSlot(null)
    setQuantity("")
    setPhone("")
    setEmail("")
    setErrors({})
    setSubmitted(false)
    setOpen(false)
  }

  const handleValidate = () => {
    const nextErrors: ReservationErrors = {}
    if (!selectedSlot) {
      nextErrors.slot = "Veuillez choisir un créneau"
    }

    try {
      getValidationSchema(selectedSlot?.reservation.maxQuantityPerPerson, unit ? UNIT_LABELS[unit] : "").validateSync(
        { quantity, phone, email },
        { abortEarly: false },
      )
    } catch (error) {
      if (error instanceof ValidationError) {
        for (const item of error.inner) {
          if (item.path === "quantity" || item.path === "phone" || item.path === "email") {
            nextErrors[item.path] = item.message
          }
        }
      } else {
        throw error
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    // La persistance de la réservation (quantités réservées/restantes, e-mail au producteur)
    // sera traitée dans un prochain ticket.
    setSubmitted(true)
    setOpen(false)
  }

  return (
    <>
      <TriggerWrapper>
        <TriggerButton $variant="green" onClick={handleOpen}>
          Réserver
        </TriggerButton>
        {submitted && !open && <Text $color={COLORS.green}>Votre réservation a bien été validée.</Text>}
      </TriggerWrapper>

      {open && (
        <Section>
          <CloseButton size="small" aria-label="Fermer" onClick={() => setOpen(false)}>
            <Close />
          </CloseButton>

          <SectionTitle>Réservation</SectionTitle>
          {instructions && <Instructions $color={COLORS.input}>{instructions}</Instructions>}

          <SlotsLabel>
            Choisissez votre créneau <span style={{ color: COLORS.red }}>*</span>
          </SlotsLabel>
          <SlotsRow>
            {upcomingSlots.map((slot, index) => (
              <SlotButton
                key={index}
                variant="contained"
                $selected={slot === selectedSlot}
                onClick={() => {
                  setSelectedSlot(slot)
                  setErrors((current) => ({ ...current, slot: undefined }))
                }}
              >
                {`Le ${slot.date.toLocaleDateString()} de ${slot.heureDebut} à ${slot.heureFin}`}
              </SlotButton>
            ))}
          </SlotsRow>
          {errors.slot && <SlotError>{errors.slot}</SlotError>}

          <FieldsRow>
            <QuantityRow>
              <TextField
                label="Quantité"
                required
                type="number"
                size="small"
                fullWidth
                value={quantity}
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity}
                onChange={(event) => {
                  setQuantity(event.target.value)
                  setErrors((current) => ({ ...current, quantity: undefined }))
                }}
              />
              {unit && <Typography variant="body1">{UNIT_LABELS[unit]}</Typography>}
            </QuantityRow>
            <TextField
              label="Téléphone"
              required
              type="tel"
              size="small"
              value={phone}
              error={Boolean(errors.phone)}
              helperText={errors.phone}
              onChange={(event) => {
                setPhone(event.target.value)
                setErrors((current) => ({ ...current, phone: undefined }))
              }}
            />
            <TextField
              label="E-mail"
              required
              type="email"
              size="small"
              value={email}
              error={Boolean(errors.email)}
              helperText={errors.email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrors((current) => ({ ...current, email: undefined }))
              }}
            />
          </FieldsRow>

          <ActionsRow>
            <GreenButton $variant="green" onClick={handleValidate}>
              Valider la réservation
            </GreenButton>
            <Button variant="contained" onClick={handleCancel}>
              Annuler
            </Button>
          </ActionsRow>
        </Section>
      )}
    </>
  )
}

export default ReservationSection
