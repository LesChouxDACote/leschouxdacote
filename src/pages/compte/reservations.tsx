import styled from "@emotion/styled"
import { TextField, Typography } from "@mui/material"
import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { Button } from "src/components/Button"
import { ValidationError as ApiValidationError } from "src/components/Form"
import HelpLink from "src/components/HelpLink"
import Link from "src/components/Link"
import Loader from "src/components/Loader"
import Modal from "src/components/Modal"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, RADIUS, SIZES, UNIT_LABELS } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { formatSlotHeading, getSlotDayLabel } from "src/helpers/date"
import { formatAmount, formatPhone, formatPricePerUnit, getMapsLink } from "src/helpers/text"
import Layout from "src/layout"
import type { BuyerReservationItem, MyReservationsResponse } from "src/models/Booking"
import { ValidationError, number } from "yup"

const MAX_QUANTITY = Number.MAX_SAFE_INTEGER

const getPageQuery = (value: string | string[] | undefined) => {
  const page = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const getQuantityError = (item: BuyerReservationItem, value: string) => {
  const unitLabel = item.product?.unit ? UNIT_LABELS[item.product.unit] : ""
  const max = item.slot?.maxQuantityPerPerson ?? null
  try {
    number()
      .typeError("La quantité doit être un nombre")
      .integer("La quantité doit être un nombre entier")
      .positive("La quantité doit être supérieure à 0")
      .required("La quantité est obligatoire")
      .max(
        max ?? MAX_QUANTITY,
        max != null ? `La quantité ne peut pas dépasser ${max} ${unitLabel}`.trim() : "La quantité est trop grande",
      )
      .validateSync(value)
    return null
  } catch (error) {
    if (error instanceof ValidationError) {
      return error.message
    }
    throw error
  }
}

const Container = styled.div`
  padding: 32px 4rem;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 30px 10px;
  }
`
const PageTitle = styled.h1`
  text-align: center;
`
const HelpRow = styled.p`
  text-align: center;
`
const SectionTitle = styled.h2`
  margin: 40px 0 0;
  font-size: ${SIZES.subtitle}px;
  font-weight: 500;
  color: ${COLORS.text};
`
// À venir en noir (la police de base, en 300, paraît grise), passées en gris discret.
const Card = styled.section<{ $past?: boolean }>`
  position: relative;
  background-color: ${COLORS.white};
  box-shadow: 5px 5px 20px ${COLORS.shadow.light};
  border-radius: ${RADIUS}px;
  padding: 20px 25px;
  margin-top: 20px;
  color: ${({ $past }) => ($past ? COLORS.muted : COLORS.text)};
  font-weight: ${({ $past }) => ($past ? 300 : 400)};

  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 20px 15px;
  }
`
const SlotHeading = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-right: 120px;
  font-size: ${SIZES.subtitle}px;
  font-weight: 700;
`
const DayBadge = styled.span`
  background-color: ${COLORS.green};
  color: ${COLORS.white};
  border-radius: 12px;
  padding: 2px 10px;
  font-size: ${SIZES.small}px;
  font-weight: 500;
  text-transform: uppercase;
`
const CardTitle = styled.h3`
  margin: 8px 0 15px;
  font-size: ${SIZES.regular}px;
  font-weight: 500;
`
const Label = styled.span`
  font-weight: 500;
`
const CancelButton = styled(Button)`
  position: absolute;
  top: 20px;
  right: 20px;
`
const Notice = styled(Text)`
  display: block;
  margin: -5px 0 15px;
  color: ${COLORS.red};
  font-weight: 500;
`
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 20px;

  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const Instructions = styled.div`
  margin-top: 15px;
  white-space: pre-line;
`
const AddressBlock = styled.div`
  margin-top: 15px;

  a {
    text-decoration: underline;
  }
`
const PricesBlock = styled.div`
  margin-top: 15px;
  font-size: ${SIZES.regular}px;

  strong {
    color: ${COLORS.green};
  }
`
const QuantityBlock = styled.div`
  margin-top: 15px;
`
const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`
const CardError = styled(Text)`
  display: block;
  margin-top: 10px;
`
const Remaining = styled(Text)`
  display: block;
  margin: 10px 0 0 8px;
`
const ButtonsRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
`
const Center = styled.div`
  margin: 30px 0;
  text-align: center;
`
const ActionError = styled(Text)`
  color: ${COLORS.red};
  display: block;
`

interface CardProps {
  item: BuyerReservationItem
  quantity: string
  error?: string
  saving: boolean
  success: boolean
  onChange: (id: string, value: string) => void
  onModify: (item: BuyerReservationItem) => void
  onCancel: (item: BuyerReservationItem) => void
}

const ReservationCard = ({ item, quantity, error, saving, success, onChange, onModify, onCancel }: CardProps) => {
  const { booking, product, slot } = item
  // Créneau passé : carte grisée, sans actions. Annonce supprimée ou créneau retiré d'un créneau à venir :
  // carte en noir avec un avertissement, annulable mais plus modifiable.
  const editable = Boolean(product && slot) && !item.isPast
  const unavailable = !item.isPast && (!product || !slot)
  const dayLabel = item.isPast ? null : getSlotDayLabel(booking.slotDate)
  const unitLabel = product?.unit ? UNIT_LABELS[product.unit] : ""
  const unitPrice = product
    ? formatPricePerUnit({
        price: product.price,
        quantity: product.quantity ?? undefined,
        unit: product.unit ?? undefined,
      })
    : ""
  const total = product
    ? formatAmount(product.quantity ? Math.round((product.price * booking.quantity) / product.quantity) : product.price)
    : null
  const unchanged = Number(quantity) === booking.quantity

  return (
    <Card $past={item.isPast}>
      {!item.isPast && (
        <CancelButton $variant="red" onClick={() => onCancel(item)}>
          Annuler
        </CancelButton>
      )}
      <SlotHeading>
        {formatSlotHeading(booking.slotDate, booking.heureDebut, booking.heureFin)}
        {dayLabel && <DayBadge>{dayLabel}</DayBadge>}
      </SlotHeading>
      <CardTitle>
        {product ? (
          <Link href={`/annonce/${product.objectID}`} target="_blank" rel="noopener">
            {product.title}
          </Link>
        ) : (
          "Annonce indisponible"
        )}
      </CardTitle>
      {unavailable && <Notice>Annonce plus disponible, contactez le producteur</Notice>}
      <InfoGrid>
        <div>
          <Label>Producteur :</Label> {product?.producer ?? "—"}
        </div>
        <div>
          <Label>Email :</Label> {product?.email ? <a href={`mailto:${product.email}`}>{product.email}</a> : "—"}
        </div>
        <div>
          <Label>Téléphone :</Label>{" "}
          {product?.phone ? <a href={`tel:${product.phone}`}>{formatPhone(product.phone)}</a> : "—"}
        </div>
      </InfoGrid>
      {slot?.instructions && (
        <Instructions>
          <Label>Consignes du producteur :</Label> {slot.instructions}
        </Instructions>
      )}
      {product && (
        <AddressBlock>
          <Label>Adresse du retrait :</Label>{" "}
          <a href={getMapsLink(product)} target="_blank" rel="noopener">
            {product.address}
          </a>
          <div>
            {product.city}
            {product.dpt ? ` (${product.dpt})` : ""}
          </div>
        </AddressBlock>
      )}
      {product && (
        <PricesBlock>
          {unitPrice && (
            <div>
              <Label>Prix :</Label> {unitPrice}
            </div>
          )}
          <div>
            <Label>Total :</Label> <strong>{total}</strong>
          </div>
        </PricesBlock>
      )}
      <QuantityBlock>
        {editable ? (
          <>
            <QuantityRow>
              <Label>Quantité :</Label>
              <TextField
                type="number"
                size="small"
                value={quantity}
                slotProps={{ htmlInput: { min: 1, step: 1, "aria-label": "Quantité" } }}
                onChange={(event) => onChange(booking.objectID, event.target.value)}
              />
              {unitLabel && <Typography variant="body1">{unitLabel}</Typography>}
              <Button $variant="green" disabled={saving || unchanged} onClick={() => onModify(item)}>
                Modifier
              </Button>
            </QuantityRow>
            {error && <CardError $color={COLORS.red}>{error}</CardError>}
            {success && <Text $color={COLORS.green}>Votre réservation a bien été modifiée.</Text>}
          </>
        ) : (
          <div>
            <Label>Quantité :</Label> {booking.quantity} {unitLabel}
          </div>
        )}
        {editable && item.remaining != null && (
          <Remaining>{`Encore ${item.remaining} ${unitLabel}`.trim()} disponibles</Remaining>
        )}
      </QuantityBlock>
    </Card>
  )
}

const MyReservationsPage = () => {
  const { loading: authLoading } = useUser()
  const { pathname, query, replace } = useRouter()
  const page = getPageQuery(query.page)

  const [data, setData] = useState<MyReservationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, string | undefined>>({})
  const [cardErrors, setCardErrors] = useState<Record<string, string | undefined>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BuyerReservationItem | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchPage = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<MyReservationsResponse>("my-reservations", { page: String(targetPage) })
      setData(response)
    } catch {
      setError("Impossible de charger vos réservations, veuillez réessayer")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // L'authentification doit être résolue pour que l'appel porte le token (sinon 403).
    if (authLoading) {
      return
    }
    fetchPage(page)
  }, [authLoading, page, fetchPage])

  const goToPage = (next: number) => {
    replace({ pathname, query: { ...query, page: String(next) } }, undefined, { shallow: true })
    window.scrollTo({ top: 0 })
  }

  const handleModify = async (item: BuyerReservationItem) => {
    const { booking, product, slot } = item
    if (!product || !slot) {
      return
    }
    const value = quantities[booking.objectID] ?? String(booking.quantity)
    const validationError = getQuantityError(item, value)
    if (validationError) {
      setCardErrors((current) => ({ ...current, [booking.objectID]: validationError }))
      return
    }
    setCardErrors((current) => ({ ...current, [booking.objectID]: undefined }))
    setSuccessId(null)
    setActionError(null)
    setSavingId(booking.objectID)
    try {
      // La modification réutilise le POST existant (même créneau, coordonnées de la réservation) :
      // le serveur revalide le créneau, le quota (transaction) et le maximum par personne, et
      // prévient le producteur (« Modification de réservation »).
      await api.post("reservation", {
        productId: booking.productId,
        slot: { date: booking.slotDate, heureDebut: booking.heureDebut, heureFin: booking.heureFin },
        quantity: Number(value),
        phone: booking.phone,
        email: booking.email,
      })
      setQuantities((current) => ({ ...current, [booking.objectID]: undefined }))
      setSuccessId(booking.objectID)
      await fetchPage(page)
    } catch (modificationError) {
      setCardErrors((current) => ({
        ...current,
        [booking.objectID]:
          modificationError instanceof ApiValidationError
            ? modificationError.message
            : "Une erreur est survenue, veuillez réessayer",
      }))
    } finally {
      setSavingId(null)
    }
  }

  const handleCancel = async () => {
    const item = cancelTarget
    if (!item) {
      return
    }
    setCancelling(true)
    setActionError(null)
    try {
      await api.delete("reservation", { productId: item.booking.productId })
      setCancelTarget(null)
      await fetchPage(page)
    } catch {
      setCancelTarget(null)
      setActionError("Impossible d’annuler la réservation, veuillez réessayer")
    } finally {
      setCancelling(false)
    }
  }

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <Layout title="Mes réservations" noindex fullWidth>
      <Container>
        <PageTitle>Mes réservations</PageTitle>
        <HelpRow>
          <HelpLink slug="mes-reservations" />
        </HelpRow>
        {actionError && (
          <Center>
            <ActionError>{actionError}</ActionError>
          </Center>
        )}
        {authLoading || loading ? (
          <Center>
            <Loader />
          </Center>
        ) : error ? (
          <Center>
            <Text>{error}</Text>
            <Button onClick={() => fetchPage(page)}>Réessayer</Button>
          </Center>
        ) : data && data.items.length === 0 ? (
          <Center>Vous n’avez aucune réservation.</Center>
        ) : (
          data && (
            <>
              {/* Liste déjà triée (à venir puis passées) : une page peut contenir l'une des sections ou les deux. */}
              {[
                { title: "À venir", items: data.items.filter((item) => !item.isPast) },
                { title: "Passées", items: data.items.filter((item) => item.isPast) },
              ]
                .filter((section) => section.items.length > 0)
                .map((section) => (
                  <div key={section.title}>
                    <SectionTitle>{section.title}</SectionTitle>
                    {section.items.map((item) => (
                      <ReservationCard
                        key={item.booking.objectID}
                        item={item}
                        quantity={quantities[item.booking.objectID] ?? String(item.booking.quantity)}
                        error={cardErrors[item.booking.objectID]}
                        saving={savingId === item.booking.objectID}
                        success={successId === item.booking.objectID}
                        onChange={(id, value) => {
                          setQuantities((current) => ({ ...current, [id]: value }))
                          setCardErrors((current) => ({ ...current, [id]: undefined }))
                          setSuccessId(null)
                        }}
                        onModify={handleModify}
                        onCancel={setCancelTarget}
                      />
                    ))}
                  </div>
                ))}
              {data.total > data.pageSize && (
                <ButtonsRow>
                  <Button disabled={data.page <= 1} onClick={() => goToPage(data.page - 1)}>
                    Précédent
                  </Button>
                  <span>
                    Page {data.page} sur {pageCount}
                  </span>
                  <Button disabled={data.page >= pageCount} onClick={() => goToPage(data.page + 1)}>
                    Suivant
                  </Button>
                </ButtonsRow>
              )}
            </>
          )
        )}
      </Container>
      {cancelTarget && (
        <Modal onClose={() => setCancelTarget(null)}>
          <Center>
            <h3>Annuler la réservation</h3>
            <p>Confirmez-vous l’annulation de cette réservation ?</p>
            <ButtonsRow>
              <Button $variant="red" onClick={handleCancel} disabled={cancelling}>
                Confirmer l’annulation
              </Button>
              <Button onClick={() => setCancelTarget(null)}>Garder ma réservation</Button>
            </ButtonsRow>
          </Center>
        </Modal>
      )}
    </Layout>
  )
}

export default MyReservationsPage
