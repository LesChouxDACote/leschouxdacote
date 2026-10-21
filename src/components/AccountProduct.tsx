import { css } from "@emotion/react"
import styled from "@emotion/styled"
import DeleteIcon from "@mui/icons-material/Delete"
import { IconButton } from "@mui/material"
import { Schema as Sc } from "effect"
import { useEffect, useMemo, useState } from "react"
import PointerIcon from "src/assets/pointer.svg"
import { Button } from "src/components/Button"
import { BasicInput, Form, SubmitButton } from "src/components/Form"
import Link, { ButtonLink } from "src/components/Link"
import Modal from "src/components/Modal"
import ProductEndDate from "src/components/ProductEndDate"
import { SocialShareBar } from "src/components/SocialShareBar/SocialShareBar"
import { COLORS, LAYOUT, MAX_PUBLICATION_DAYS, SIZES } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import {
  daysFromNow,
  formatDate,
  formatDateTime,
  formatSlotDate,
  getSlotEnd,
  getSlotKey,
  sortSlots,
} from "src/helpers/date"
import { formatAmount, formatQuantity, s } from "src/helpers/text"
import type { ReservationsResponse } from "src/models/Booking"
import { ProductEncoded } from "src/models/Product"
import { SlotSchemaFirestore } from "src/pages/compte/producteur/annonce"
import type { Booking } from "src/types/model"

// Nombre de créneaux à venir affichés avant « Voir tous les créneaux »
const VISIBLE_SLOTS = 3

const Container = styled.div<{ $odd?: boolean }>`
  position: relative;
  margin: 20px 0;
  background-color: ${({ $odd }) => ($odd ? COLORS.odd : COLORS.white)};
  padding: 20px;
  border-radius: 8px;
  transition: box-shadow 150ms;
  &:hover {
    box-shadow: 0 3px 8px ${COLORS.shadow.light};
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 0 -24px;
    border-radius: 0;
  }
`
// Au-dessus du lien qui couvre toute la carte (cf. Infos h4 a::after) : ces éléments gardent leur propre action
const aboveLink = css`
  position: relative;
  z-index: 1;
`
const Ad = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas: "image infos" "days infos";
  grid-template-rows: auto 1fr;
  column-gap: 20px;
  @media (min-width: ${LAYOUT.mobile}px) {
    margin-bottom: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid ${COLORS.border};
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 80px 1fr;
    grid-template-areas: "image infos" "days days";
    column-gap: 12px;
  }
`
const Image = styled.div`
  grid-area: image;
  img {
    display: block;
    width: 200px;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
    @media (max-width: ${LAYOUT.mobile}px) {
      width: 80px;
      height: 80px;
    }
  }
`
const Infos = styled.div`
  grid-area: infos;
  min-width: 0;
  h4 {
    font-size: 18px;
    font-weight: normal;
    margin: 0 0 5px;
    @media (min-width: ${LAYOUT.mobile}px) {
      padding-right: 160px;
    }
    a::after {
      content: "";
      position: absolute;
      inset: 0;
    }
  }
`
const Days = styled.div`
  grid-area: days;
  margin: 8px 0 0;
  color: ${COLORS.grey};
  font-size: ${SIZES.small}px;
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 12px 0 0;
  }
`
const SlotsBlock = styled.div`
  margin: 15px 0 0;
  ul {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
  }
`
const SlotsTitle = styled.div`
  font-size: ${SIZES.regular}px;
  font-weight: 400;
`
const SlotItem = styled.li<{ $past: boolean }>`
  margin: 2px 0;
  color: ${({ $past }) => ($past ? COLORS.grey : "inherit")};
  span {
    color: ${COLORS.grey};
  }
`
const NoSlot = styled.p`
  margin: 4px 0 0;
  color: ${COLORS.grey};
`
const SlotsToggle = styled.button`
  ${aboveLink}
  padding: 0;
  margin-top: 4px;
  color: ${COLORS.green};
  text-decoration: underline;
`
const Stats = styled.div`
  width: 120px;
  text-align: center;
  figure {
    font-size: ${SIZES.large}px;
    font-weight: 400;
    margin: 12px 8px 4px;
    svg {
      vertical-align: -4px;
      margin-right: 4px;
    }
  }
  figcaption {
    font-size: ${SIZES.small}px;
    color: ${COLORS.grey};
  }
`
const Actions = styled.div`
  ${aboveLink}
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 12px;
  @media (min-width: ${LAYOUT.mobile}px) {
    margin-top: 0;
    position: absolute;
    top: 12px;
    right: 12px;
  }
  svg {
    fill: ${COLORS.dark};
    vertical-align: middle;
  }
`
const End = styled.div`
  font-weight: 400;
`
const Bottom = styled.div`
  position: relative;
  em {
    font-size: ${SIZES.regular}px;
  }
`
const BottomActions = styled.div`
  ${aboveLink}
  button {
    margin: 10px 10px 0 0;
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    display: flex;
    justify-content: space-between;
    button {
      padding: 6px 12px;
      &:last-of-type {
        margin-right: 0;
      }
    }
    em {
      display: none;
    }
  }
`
const Status = styled.div<{ $active: boolean }>`
  @media (min-width: ${LAYOUT.mobile}px) {
    position: absolute;
    top: 0;
    right: 0;
  }
  margin-bottom: 8px;
  color: ${({ $active }) => ($active ? COLORS.green : COLORS.red)};
  font-weight: 400;
  font-size: ${SIZES.large}px;
  &::before {
    content: "";
    background-color: ${({ $active }) => ($active ? COLORS.green : COLORS.red)};
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    vertical-align: 0;
    margin-right: 12px;
  }
`
const Input = styled(BasicInput)`
  width: 65px;
  padding: 10px;
`

const StyledSocialBar = styled(SocialShareBar)`
  position: absolute;
  z-index: 1;
  right: -10px;
  top: -12px;
  @media (min-width: ${LAYOUT.mobile}px) {
    top: 26px;
  }
`

interface Props {
  product: ProductEncoded
  odd?: boolean
}

const AccountProduct = ({ product, odd }: Props) => {
  const { loading } = useUser()
  const [modal, setModal] = useState<null | "publish" | "disable" | "delete">(null)
  const [showAllSlots, setShowAllSlots] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const infos = [formatAmount(product.price), formatQuantity(product), product.city]
  const now = Date.now()
  const active = product.expires ? product.expires > now : false

  const slots = useMemo(
    () => sortSlots(product.slots ? Sc.decodeUnknownSync(Sc.Array(SlotSchemaFirestore))(product.slots) : []),
    [product.slots],
  )
  const upcomingSlots = slots.filter((slot) => getSlotEnd(slot.date, slot.heureFin) >= now)
  const visibleSlots = showAllSlots ? slots : upcomingSlots.slice(0, VISIBLE_SLOTS)
  const reservable = slots.some((slot) => slot.reservation != null)

  // Réservations des clients (réservées au producteur propriétaire) : nombre par créneau et avertissement à la suppression
  useEffect(() => {
    if (loading || !reservable) {
      return
    }
    let cancelled = false
    api
      .get<ReservationsResponse>("reservation", { productId: product.objectID })
      .then((data) => {
        if (!cancelled && data.owner) {
          setBookings(data.bookings ?? [])
        }
      })
      .catch(() => {
        // Réservations indisponibles : la carte s'affiche sans les compteurs.
      })
    return () => {
      cancelled = true
    }
  }, [loading, reservable, product.objectID])

  const bookingsBySlot: Record<string, number> = {}
  for (const booking of bookings) {
    const key = getSlotKey(new Date(booking.slotDate), booking.heureDebut, booking.heureFin)
    bookingsBySlot[key] = (bookingsBySlot[key] ?? 0) + 1
  }
  const upcomingBookings = bookings.filter((booking) => getSlotEnd(new Date(booking.slotDate), booking.heureFin) >= now)

  const handlePublish: Submit<{ days: string }> = async (data) => {
    const days = Number(data.days)
    if (days) {
      const payload: Publish = { id: product.objectID, days }
      await api.post("publish", payload)
    }
    setModal(null)
  }

  const handleDisable: Submit<never> = async () => {
    const payload: Publish = { id: product.objectID }
    await api.put("publish", payload)
    setModal(null)
  }

  const handleDelete: Submit<never> = async () => {
    const payload: Publish = { id: product.objectID }
    await api.delete("publish", payload)
    setModal(null)
  }

  const handleClose = () => setModal(null)

  const productShareData: ShareData = {
    url: `${process.env.NEXT_PUBLIC_URL}/annonce/${product.objectID}`,
  }

  return (
    <Container $odd={odd}>
      <Ad>
        <Image>
          <img src={product.photo} alt="" />
        </Image>
        <Days>
          Annonce créée le {formatDate(product.created)}
          {product.updated && <> et modifiée le {formatDate(product.updated)}</>}
        </Days>
        <Infos>
          <h4>
            <Link href={`/annonce/${product.objectID}`}>{product.title}</Link>
          </h4>
          <div>{infos.filter((info) => info).join(" | ")}</div>
          {slots.length > 0 && (
            <SlotsBlock>
              <SlotsTitle>Créneaux</SlotsTitle>
              {upcomingSlots.length === 0 && !showAllSlots && <NoSlot>Aucun créneau à venir</NoSlot>}
              <ul>
                {visibleSlots.map(({ date, heureDebut, heureFin, reservation }) => {
                  const key = getSlotKey(date, heureDebut, heureFin)
                  const count = bookingsBySlot[key] ?? 0
                  return (
                    <SlotItem key={key} $past={getSlotEnd(date, heureFin) < now}>
                      {formatSlotDate(date, heureDebut, heureFin)}
                      {reservation != null && (
                        <span>
                          {" "}
                          · {count} réservation{s(count)}
                        </span>
                      )}
                    </SlotItem>
                  )
                })}
              </ul>
              {slots.length > Math.min(upcomingSlots.length, VISIBLE_SLOTS) && (
                <SlotsToggle type="button" onClick={() => setShowAllSlots(!showAllSlots)}>
                  {showAllSlots ? "Voir moins" : `Voir tous les créneaux (${slots.length})`}
                </SlotsToggle>
              )}
            </SlotsBlock>
          )}
          <Stats>
            <figure>
              <PointerIcon /> {product.views || 0}
            </figure>
            <figcaption>Nombre de clics</figcaption>
          </Stats>
        </Infos>
      </Ad>
      <Actions>
        <ButtonLink href={`/compte/producteur/annonce/${product.objectID}`}>Modifier</ButtonLink>
        <IconButton aria-label="Supprimer l’annonce" onClick={() => setModal("delete")}>
          <DeleteIcon />
        </IconButton>
      </Actions>
      {active ? (
        <Bottom>
          <Status $active={true}>Annonce en ligne</Status>
          <StyledSocialBar shareData={productShareData} />
          <End>
            La publication se termine le {formatDateTime(product.expires)} ({daysFromNow(product.expires)})
          </End>
          <BottomActions>
            <Button $variant="green" onClick={() => setModal("publish")}>
              Ajouter des jours
            </Button>
            <Button onClick={() => setModal("disable")}>Désactiver l’annonce</Button>
            <em>Vous pourrez la réactiver</em>
          </BottomActions>
        </Bottom>
      ) : (
        <Bottom>
          {product.expires ? (
            <>
              <Status $active={false}>Annonce terminée</Status>
              <End>La publication s’est terminée le {formatDateTime(product.expires)}</End>
            </>
          ) : (
            <>
              <Status $active={false}>Annonce désactivée</Status>
              <End>La publication est désactivée</End>
            </>
          )}
          <BottomActions>
            <Button $variant="green" onClick={() => setModal("publish")}>
              Publier l’annonce
            </Button>
          </BottomActions>
        </Bottom>
      )}
      {modal && (
        <Modal onClose={handleClose}>
          {modal === "publish" && (
            <Form title={product.title} onSubmit={handlePublish}>
              <p>
                Publier l’annonce pour une durée de{" "}
                <Input type="number" name="days" min={0} max={MAX_PUBLICATION_DAYS} step={1} defaultValue={0} /> jour(s)
                supplémentaires
              </p>
              <ProductEndDate start={active ? product.expires : null} />
              <SubmitButton />
            </Form>
          )}
          {modal === "disable" && (
            <Form title={product.title} onSubmit={handleDisable}>
              <p>Désactiver l’annonce ?</p>
              <SubmitButton />
            </Form>
          )}
          {modal === "delete" && (
            <Form title={product.title} onSubmit={handleDelete}>
              <p>Supprimer définitivement l’annonce ?</p>
              <p>Cette action est irréversible.</p>
              {upcomingBookings.length > 0 && (
                <p>
                  <strong>
                    {upcomingBookings.length > 1
                      ? `${upcomingBookings.length} clients ont réservé un créneau à venir sur cette annonce.`
                      : "1 client a réservé un créneau à venir sur cette annonce."}
                  </strong>
                </p>
              )}
              <SubmitButton />
            </Form>
          )}
        </Modal>
      )}
    </Container>
  )
}

export default AccountProduct
