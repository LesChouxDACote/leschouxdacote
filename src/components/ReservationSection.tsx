import styled from "@emotion/styled"
import { Check, Close } from "@mui/icons-material"
import { Button, IconButton, TextField, Typography } from "@mui/material"
import { useRouter } from "next/router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button as GreenButton } from "src/components/Button"
import { ValidationError as ApiValidationError } from "src/components/Form"
import HelpLink from "src/components/HelpLink"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, RADIUS, SIZES, UNIT_LABELS } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { formatSlotDate, formatSlotHeading, getSlotDayLabel, getSlotEnd, getSlotKey, sortSlots } from "src/helpers/date"
import { validatePhoneNumber } from "src/helpers/validators"
import type { ReservationsResponse } from "src/models/Booking"
import type { Reservation, SlotSchemaFirestore } from "src/pages/compte/producteur/annonce"
import type { Booking, Unit } from "src/types/model"
import { ValidationError, number, object, string } from "yup"

export type ReservableSlot = SlotSchemaFirestore & { reservation: Reservation }

const isReservable = (slot: SlotSchemaFirestore): slot is ReservableSlot => slot.reservation != null

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

const ListSection = styled.section`
  background-color: ${COLORS.white};
  box-shadow: 20px 20px 60px ${COLORS.shadow.light};
  border-radius: ${RADIUS}px;
  margin-top: 30px;
  padding: 20px 25px;

  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 20px 10px;
  }
`

const SlotList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const slotItemCss = `
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
  padding: 10px 15px;
  border: 1px solid ${COLORS.border};
  border-radius: ${RADIUS}px;
  background-color: ${COLORS.white};
  color: ${COLORS.text};
  font-size: ${SIZES.regular}px;
  text-align: left;
`

const SlotItem = styled.div`
  ${slotItemCss}
`

// Créneau réservable : un clic ouvre la réservation avec ce créneau choisi
const SlotItemButton = styled.button`
  ${slotItemCss}
  border-color: ${COLORS.green};
  cursor: pointer;
  transition: background-color 150ms;

  &:hover,
  &:focus-visible {
    background-color: ${COLORS.background.success};
  }
`

const SlotHeading = styled.span`
  font-weight: bold;
`

const DayTag = styled.span`
  font-size: ${SIZES.small}px;
  color: ${COLORS.white};
  background-color: ${COLORS.blue};
  border-radius: 12px;
  padding: 2px 10px;
`

const SlotStatus = styled.span<{ $full?: boolean }>`
  margin-left: auto;
  font-size: ${SIZES.small}px;
  color: ${({ $full }) => ($full ? COLORS.muted : COLORS.green)};
  font-weight: bold;
`

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
  border-radius: ${RADIUS}px;
  padding: 20px 25px;
  margin-top: 30px;

  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 20px 15px;
  }
`

const SectionTitle = styled.h3`
  margin: 0 0 15px;
  font-size: ${SIZES.subtitle}px;
  font-weight: bold;
`

const HelpRow = styled.div`
  margin: -10px 0 15px;
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

const SelectedSlot = styled(Text)`
  margin-top: 12px;
  font-weight: bold;
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
  font-size: ${SIZES.small}px;
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
  slots: readonly SlotSchemaFirestore[]
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
  const [booking, setBooking] = useState<Booking | null>(null)
  const [now, setNow] = useState<number | null>(null)

  const fetchBooked = useCallback(async () => {
    try {
      const data = await api.get<ReservationsResponse>("reservation", { productId })
      setBooked(data.booked ?? {})
      setBooking(data.booking ?? null)
    } catch {
      // Totaux indisponibles : les créneaux restent affichés sans état « complet ».
    }
  }, [productId])

  useEffect(() => {
    // L'authentification doit être résolue pour que l'appel porte le token : sans lui, l'API ne
    // renverrait pas la réservation de l'acheteur connecté (préremplissage).
    if (loading) {
      return
    }
    setNow(Date.now())
    fetchBooked()
  }, [loading, fetchBooked])

  // La page est générée statiquement : l'heure courante n'est connue qu'une fois la page chargée
  // dans le navigateur. On ne rend donc rien avant, pour éviter que des créneaux passés ou le bouton
  // « Réserver » n'apparaissent un instant puis ne disparaissent au chargement.
  const upcomingSlots = useMemo(
    () => (now === null ? [] : sortSlots(slots.filter((slot) => getSlotEnd(slot.date, slot.heureFin) >= now))),
    [slots, now],
  )
  // Seuls les créneaux à venir dont la réservation est ouverte se réservent
  const reservableSlots = useMemo(() => upcomingSlots.filter(isReservable), [upcomingSlots])

  if (now === null || upcomingSlots.length === 0) {
    return null
  }

  const unitLabel = unit ? UNIT_LABELS[unit] : ""
  const instructions = (selectedSlot ?? reservableSlots[0])?.reservation.instructions ?? null
  const selectedKey = selectedSlot
    ? getSlotKey(selectedSlot.date, selectedSlot.heureDebut, selectedSlot.heureFin)
    : null
  const ownSlotUpcoming = booking != null && getSlotEnd(new Date(booking.slotDate), booking.heureFin) >= now

  const getSlotBooked = (slot: ReservableSlot) => booked[getSlotKey(slot.date, slot.heureDebut, slot.heureFin)] ?? 0

  // La réservation en cours de l'acheteur compte dans le total du créneau : elle est déduite pour
  // évaluer ce qui lui reste disponible (le serveur exclut de même sa propre réservation), sinon
  // son créneau apparaîtrait « complet » et la validation serait bloquée à tort.
  const getOwnQuantity = (slot: ReservableSlot) =>
    booking &&
    booking.slotDate === slot.date.getTime() &&
    booking.heureDebut === slot.heureDebut &&
    booking.heureFin === slot.heureFin
      ? booking.quantity
      : 0

  const isFull = (slot: ReservableSlot) => getSlotBooked(slot) - getOwnQuantity(slot) >= slot.reservation.totalQuantity

  const getRemaining = (slot: ReservableSlot) => Math.max(0, slot.reservation.totalQuantity - getSlotBooked(slot))

  const selectSlot = (slot: ReservableSlot) => {
    setSelectedSlot(slot)
    setErrors((current) => ({ ...current, slot: undefined }))
  }

  // `slot` : créneau cliqué dans la liste, présélectionné à la place de celui de la réservation existante
  const handleOpen = (slot?: ReservableSlot) => {
    if (loading) {
      return
    }
    if (!authUser) {
      replace("/connexion?next=" + asPath)
      return
    }
    if (open && slot) {
      // Formulaire déjà ouvert : seul le créneau change, la saisie en cours est gardée
      selectSlot(slot)
      return
    }
    if (booking) {
      // Dernière réservation enregistrée : le formulaire est prérempli avec son état. Le créneau
      // n'est présélectionné que s'il est encore à venir ; sinon (passé ou supprimé), l'acheteur
      // en choisit un autre et la validation remplace l'ancienne réservation.
      const bookedSlot =
        reservableSlots.find(
          (item) =>
            item.date.getTime() === booking.slotDate &&
            item.heureDebut === booking.heureDebut &&
            item.heureFin === booking.heureFin,
        ) ?? null
      setSelectedSlot(slot ?? bookedSlot)
      setQuantity(String(booking.quantity))
      setPhone(booking.phone)
      setEmail(booking.email)
    } else {
      setSelectedSlot(slot ?? null)
      setEmail((current) => current || authUser.email)
    }
    setErrors({})
    setGlobalError(null)
    setSubmitted(false)
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
      getValidationSchema(selectedSlot?.reservation.maxQuantityPerPerson, unitLabel).validateSync(
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
      <ListSection>
        <SectionTitle>Créneaux de retrait</SectionTitle>
        <SlotList>
          {upcomingSlots.map((slot) => {
            const key = getSlotKey(slot.date, slot.heureDebut, slot.heureFin)
            const dayLabel = getSlotDayLabel(slot.date, new Date(now))
            const content = (
              <>
                <SlotHeading>{formatSlotHeading(slot.date, slot.heureDebut, slot.heureFin)}</SlotHeading>
                {dayLabel && <DayTag>{dayLabel}</DayTag>}
              </>
            )

            if (!isReservable(slot)) {
              return (
                <li key={key}>
                  <SlotItem>{content}</SlotItem>
                </li>
              )
            }
            const full = isFull(slot)
            const status = (
              <SlotStatus $full={full}>
                {full
                  ? "Réservation possible · Complet"
                  : ["Réservation possible · Reste", getRemaining(slot), unitLabel]
                      .filter((part) => part !== "")
                      .join(" ")}
              </SlotStatus>
            )

            return (
              <li key={key}>
                {full ? (
                  <SlotItem>
                    {content}
                    {status}
                  </SlotItem>
                ) : (
                  <SlotItemButton type="button" onClick={() => handleOpen(slot)}>
                    {content}
                    {status}
                  </SlotItemButton>
                )}
              </li>
            )
          })}
        </SlotList>
      </ListSection>

      {reservableSlots.length > 0 && (
        <TriggerWrapper>
          {booking && ownSlotUpcoming && (
            <Text>
              {`Vous avez réservé : ${formatSlotDate(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)} · ${[booking.quantity, unitLabel].filter((part) => part !== "").join(" ")}`}
            </Text>
          )}
          <TriggerButton $variant="green" onClick={() => handleOpen()}>
            {booking ? "Modifier ma réservation" : "Réserver"}
          </TriggerButton>
          {submitted && !open && <Text $color={COLORS.green}>Votre réservation a bien été validée.</Text>}
        </TriggerWrapper>
      )}

      {open && (
        <Section>
          <CloseButton size="small" aria-label="Fermer" onClick={() => setOpen(false)}>
            <Close />
          </CloseButton>

          <SectionTitle>Réservation</SectionTitle>
          <HelpRow>
            <HelpLink slug="reserver" />
          </HelpRow>

          <SlotsLabel>Choisissez votre créneau *</SlotsLabel>
          <SlotsRow>
            {reservableSlots.map((slot) => {
              const full = isFull(slot)
              const key = getSlotKey(slot.date, slot.heureDebut, slot.heureFin)
              // Comparé par clé : la page redécode ses créneaux à chaque rendu, les objets changent
              const selected = key === selectedKey

              // Créneau choisi : bouton plein avec une coche, les autres en contour
              return (
                <Button
                  key={key}
                  variant={selected ? "contained" : "outlined"}
                  startIcon={selected ? <Check /> : undefined}
                  aria-pressed={selected}
                  disabled={full}
                  onClick={() => selectSlot(slot)}
                >
                  {`${formatSlotHeading(slot.date, slot.heureDebut, slot.heureFin)}${full ? " (complet)" : ""}`}
                </Button>
              )
            })}
          </SlotsRow>
          {selectedSlot && (
            <SelectedSlot $color={COLORS.green}>
              {`Créneau choisi : ${formatSlotDate(selectedSlot.date, selectedSlot.heureDebut, selectedSlot.heureFin)}`}
            </SelectedSlot>
          )}
          {errors.slot && <SlotError>{errors.slot}</SlotError>}
          {instructions && <Instructions $color={COLORS.muted}>{instructions}</Instructions>}

          <FieldsRow>
            <QuantityRow>
              <TextField
                label="Quantité"
                required
                type="number"
                size="small"
                fullWidth
                value={quantity}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
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
            <GreenButton $variant="white" onClick={handleCancel}>
              Annuler la réservation
            </GreenButton>
          </ActionsRow>
          {globalError && <SlotError>{globalError}</SlotError>}
        </Section>
      )}
    </>
  )
}

export default ReservationSection
