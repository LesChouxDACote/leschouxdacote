import styled from "@emotion/styled"
import { Close } from "@mui/icons-material"
import { Button, IconButton, TextField, Typography } from "@mui/material"
import { useRouter } from "next/router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ValidationError, number, object, string } from "yup"
import { Button as GreenButton } from "src/components/Button"
import { ValidationError as ApiValidationError } from "src/components/Form"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, SIZES, UNIT_LABELS } from "src/constants"
import { useUser } from "src/helpers/auth"
import { getSlotEnd, getSlotKey } from "src/helpers/date"
import api from "src/helpers/api"
import { validatePhoneNumber } from "src/helpers/validators"
import type { ReservationsResponse } from "src/models/Booking"
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
  margin-top: 15px;
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
  productId: string
  slots: readonly ReservableSlot[]
  unit: Unit | null
}

const ReservationSection = ({ productId, slots, unit }: ReservationSectionProps) => {
  const { authUser, loading } = useUser()
  const { asPath, replace } = useRouter()

  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ReservableSlot | null>(null)
  const [quantity, setQuantity] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<ReservationErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState<Record<string, number>>({})
  const [now, setNow] = useState<number | null>(null)

  const fetchBooked = useCallback(async () => {
    try {
      const data = await api.get<ReservationsResponse>("reservation", { productId })
      setBooked(data.booked ?? {})
    } catch {
      // Totaux indisponibles : les créneaux restent affichés sans état « complet ».
    }
  }, [productId])

  useEffect(() => {
    setNow(Date.now())
    fetchBooked()
  }, [fetchBooked])

  // La page est générée statiquement : l'heure courante n'est connue qu'une fois la page chargée
  // dans le navigateur. On ne rend donc rien avant, pour éviter que le bouton « Réserver »
  // n'apparaisse un instant puis ne disparaisse au chargement.
  const upcomingSlots = useMemo(
    () => (now === null ? [] : slots.filter((slot) => getSlotEnd(slot.date, slot.heureFin) >= now)),
    [slots, now],
  )

  if (now === null || upcomingSlots.length === 0) {
    return null
  }

  const instructions = (selectedSlot ?? upcomingSlots[0])?.reservation.instructions ?? null

  const getSlotBooked = (slot: ReservableSlot) => booked[getSlotKey(slot.date, slot.heureDebut, slot.heureFin)] ?? 0

  const isFull = (slot: ReservableSlot) => getSlotBooked(slot) >= slot.reservation.totalQuantity

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
    setGlobalError(null)
    setSubmitted(false)
    setOpen(false)
  }

  const handleValidate = async () => {
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
    if (Object.keys(nextErrors).length > 0 || !selectedSlot) {
      return
    }

    setSubmitting(true)
    setGlobalError(null)
    try {
      await api.post("reservation", {
        productId,
        slot: {
          date: selectedSlot.date.getTime(),
          heureDebut: selectedSlot.heureDebut,
          heureFin: selectedSlot.heureFin,
        },
        quantity: Number(quantity),
        phone,
        email,
      })
      setSubmitted(true)
      setOpen(false)
      fetchBooked()
    } catch (error) {
      if (error instanceof ApiValidationError) {
        const field = error.field as keyof ReservationErrors
        setErrors((current) => ({ ...current, [field]: error.message }))
      } else {
        setGlobalError("Une erreur est survenue, veuillez réessayer")
      }
    } finally {
      setSubmitting(false)
    }
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

          <SlotsLabel>
            Choisissez votre créneau <span style={{ color: COLORS.red }}>*</span>
          </SlotsLabel>
          <SlotsRow>
            {upcomingSlots.map((slot, index) => {
              const full = isFull(slot)

              return (
                <SlotButton
                  key={index}
                  variant="contained"
                  $selected={slot === selectedSlot}
                  disabled={full}
                  onClick={() => {
                    setSelectedSlot(slot)
                    setErrors((current) => ({ ...current, slot: undefined }))
                  }}
                >
                  {`Le ${slot.date.toLocaleDateString()} de ${slot.heureDebut} à ${slot.heureFin}${full ? " (complet)" : ""}`}
                </SlotButton>
              )
            })}
          </SlotsRow>
          {errors.slot && <SlotError>{errors.slot}</SlotError>}
          {instructions && <Instructions $color={COLORS.input}>{instructions}</Instructions>}

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
            <GreenButton $variant="green" onClick={handleValidate} disabled={submitting}>
              Valider la réservation
            </GreenButton>
            <Button variant="contained" onClick={handleCancel}>
              Annuler la réservation
            </Button>
          </ActionsRow>
          {globalError && <SlotError>{globalError}</SlotError>}
        </Section>
      )}
    </>
  )
}

export default ReservationSection
