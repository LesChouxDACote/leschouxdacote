import styled from "@emotion/styled"
import { TextField, Typography } from "@mui/material"
import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { ValidationError, number } from "yup"
import { ValidationError as ApiValidationError } from "src/components/Form"
import { Button } from "src/components/Button"
import Link from "src/components/Link"
import Loader from "src/components/Loader"
import Modal from "src/components/Modal"
import { Text } from "src/components/Text"
import { COLORS, LAYOUT, SIZES, UNIT_LABELS } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { formatDate } from "src/helpers/date"
import { formatAmount, formatPhone, formatPricePerUnit, getMapsLink } from "src/helpers/text"
import Layout from "src/layout"
import type { BuyerReservationItem, MyReservationsResponse } from "src/models/Booking"

const MAX_QUANTITY = Number.MAX_SAFE_INTEGER

const getPageQuery = (value: string | string[] | undefined) => {
  const page = Number(Array.isArray(value) ? value[0] : value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const formatHours = (heure: string) => heure.replace(":", "h")

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
const Card = styled.section<{ $muted?: boolean }>`
  position: relative;
  background-color: white;
  box-shadow: 5px 5px 20px #00000029;
  border-radius: 6px;
  padding: 20px 25px;
  margin-top: 20px;
  color: ${({ $muted }) => ($muted ? COLORS.grey : "inherit")};

  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 20px 15px;
  }
`
const CardTitle = styled.h2`
  margin: 0 0 15px;
  padding-right: 120px;
`
const CancelButton = styled(Button)`
  position: absolute;
  top: 20px;
  right: 20px;
`
const Notice = styled(Text)`
  display: block;
  margin: -10px 0 15px;
  font-style: italic;
`
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 20px;

  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const SlotRow = styled(InfoGrid)`
  grid-template-columns: 1fr 2fr;
  margin-top: 15px;

  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 1fr;
  }
`
const Instructions = styled(Text)`
  font-style: italic;
`
const AddressBlock = styled.div`
  margin-top: 15px;

  a:hover {
    text-decoration: underline;
  }
`
const PricesBlock = styled.div`
  margin-top: 15px;
  font-size: ${SIZES.card}px;

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
  // Créneau passé, annonce supprimée ou créneau retiré : carte grisée, sans actions.
  const muted = item.isPast || !product || !slot
  const editable = Boolean(product && slot) && !item.isPast
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
    <Card $muted={muted}>
      {!item.isPast && (
        <CancelButton $variant="red" onClick={() => onCancel(item)}>
          Annuler
        </CancelButton>
      )}
      <CardTitle>
        {product ? (
          <Link href={`/annonce/${product.objectID}`} target="_blank" rel="noopener">
            {product.title}
          </Link>
        ) : (
          "Annonce indisponible"
        )}
      </CardTitle>
      {product && !slot && <Notice>Annonce indisponible</Notice>}
      <InfoGrid>
        <div>{product?.producer ?? "—"}</div>
        <div>Email : {product?.email ? <a href={`mailto:${product.email}`}>{product.email}</a> : "—"}</div>
        <div>Tél : {product?.phone ? <a href={`tel:${product.phone}`}>{formatPhone(product.phone)}</a> : "—"}</div>
      </InfoGrid>
      <SlotRow>
        <div>
          {formatDate(booking.slotDate, "dd/MM/yyyy")} de {formatHours(booking.heureDebut)} à{" "}
          {formatHours(booking.heureFin)}
        </div>
        {slot?.instructions && <Instructions $color={COLORS.input}>{slot.instructions}</Instructions>}
      </SlotRow>
      {product && (
        <AddressBlock>
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
          {unitPrice && <div>{unitPrice}</div>}
          <div>
            Total : <strong>{total}</strong>
          </div>
        </PricesBlock>
      )}
      <QuantityBlock>
        {editable ? (
          <>
            <QuantityRow>
              <span>Quantité :</span>
              <TextField
                type="number"
                size="small"
                value={quantity}
                inputProps={{ min: 1, step: 1, "aria-label": "Quantité" }}
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
            Quantité : {booking.quantity} {unitLabel}
          </div>
        )}
        {editable && item.remaining != null && <Remaining>{item.remaining} quantités restantes</Remaining>}
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
              {data.items.map((item) => (
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
