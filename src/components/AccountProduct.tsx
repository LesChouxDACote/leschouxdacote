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
import { COLORS, LAYOUT, MAX_PUBLICATION_DAYS, RADIUS, SIZES } from "src/constants"
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

export type AccountProductVariant = "current" | "v1" | "v2" | "v3"

const Container = styled.div<{ $odd?: boolean; $variant: AccountProductVariant }>`
  position: relative;
  margin: 20px 0;
  background-color: ${({ $odd }) => ($odd ? COLORS.odd : COLORS.white)};
  padding: 20px;
  border-radius: ${RADIUS}px;
  transition: box-shadow 150ms;
  &:hover {
    box-shadow: 0 3px 8px ${COLORS.shadow.light};
  }
  ${({ $variant }) =>
    $variant === "v2" &&
    css`
      @media (min-width: ${LAYOUT.mobile}px) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 310px;
        grid-template-rows: auto 1fr;
        column-gap: 24px;
      }
    `}
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
const Ad = styled.div<{ $variant: AccountProductVariant }>`
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas: "image infos" "days infos";
  grid-template-rows: auto 1fr;
  column-gap: 20px;
  @media (min-width: ${LAYOUT.mobile}px) {
    margin-bottom: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid ${COLORS.border};
    ${({ $variant }) =>
      $variant === "v1" &&
      css`
        grid-template-columns: 200px minmax(200px, 1fr) minmax(260px, 1.15fr);
        grid-template-areas:
          "image infos slots"
          "days infos slots";
        column-gap: 24px;
        align-items: start;
      `}
    ${({ $variant }) =>
      $variant === "v2" &&
      css`
        grid-column: 1;
        grid-row: 1 / span 2;
        margin-bottom: 0;
        padding-bottom: 0;
        padding-right: 24px;
        border-bottom: none;
        border-right: 1px solid ${COLORS.border};
      `}
    ${({ $variant }) =>
      $variant === "v3" &&
      css`
        grid-template-columns: 200px minmax(0, 1fr) 150px;
        grid-template-areas:
          "image infos stats"
          "days slots slots";
        column-gap: 20px;
        row-gap: 12px;
      `}
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    grid-template-columns: 80px 1fr;
    grid-template-areas:
      "image infos"
      "days days"
      "stats stats"
      "slots slots";
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
    border-radius: ${RADIUS}px;
    @media (max-width: ${LAYOUT.mobile}px) {
      width: 80px;
      height: 80px;
    }
  }
`
const Infos = styled.div<{ $variant: AccountProductVariant }>`
  grid-area: infos;
  min-width: 0;
  h4 {
    font-size: ${SIZES.subtitle}px;
    font-weight: normal;
    margin: 0 0 5px;
    @media (min-width: ${LAYOUT.mobile}px) {
      padding-right: ${({ $variant }) => ($variant === "current" ? "160px" : "0")};
    }
    a::after {
      content: "";
      position: absolute;
      inset: 0;
    }
  }
`
const ProductMeta = styled.div<{ $variant: AccountProductVariant }>`
  color: ${({ $variant }) => ($variant === "current" ? COLORS.text : COLORS.muted)};
`
const Days = styled.div`
  grid-area: days;
  margin: 8px 0 0;
  color: ${COLORS.text};
  font-size: ${SIZES.regular}px;
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 12px 0 0;
  }
`
const SlotsBlock = styled.div<{ $variant: AccountProductVariant; $odd?: boolean }>`
  margin: 15px 0 0;
  ${({ $variant }) =>
    ($variant === "v1" || $variant === "v3") &&
    css`
      grid-area: slots;
    `}
  ul {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant, $odd }) =>
      $variant === "v1" &&
      css`
        margin: 44px 0 0;
        padding: 12px 16px;
        background-color: ${$odd ? COLORS.white : COLORS.odd};
        border: 1px solid ${COLORS.border};
        border-radius: ${RADIUS}px;
      `}
    ${({ $variant }) =>
      $variant === "v3" &&
      css`
        margin: 4px 0 0;
        ul {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
      `}
  }
`
const SlotsTitle = styled.div`
  font-size: ${SIZES.regular}px;
  font-weight: 400;
`
const SlotItem = styled.li<{ $past: boolean; $variant: AccountProductVariant; $odd?: boolean }>`
  margin: 2px 0;
  color: ${({ $past }) => ($past ? COLORS.muted : "inherit")};
  span {
    color: ${COLORS.muted};
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant, $odd }) =>
      $variant === "v3" &&
      css`
        margin: 0;
        padding: 6px 12px;
        background-color: ${$odd ? COLORS.white : COLORS.odd};
        border: 1px solid ${COLORS.border};
        border-radius: ${RADIUS}px;
        font-size: ${SIZES.small}px;
      `}
  }
`
const NoSlot = styled.p`
  margin: 4px 0 0;
  color: ${COLORS.muted};
`
const SlotsToggle = styled.button`
  ${aboveLink}
  padding: 0;
  margin-top: 4px;
  color: ${COLORS.green};
  text-decoration: underline;
`
const Stats = styled.div<{ $variant: AccountProductVariant; $odd?: boolean }>`
  width: 120px;
  text-align: center;
  ${({ $variant }) =>
    $variant === "v3" &&
    css`
      grid-area: stats;
    `}
  figure {
    font-size: ${SIZES.subtitle}px;
    font-weight: 400;
    margin: 12px 8px 4px;
    svg {
      vertical-align: -4px;
      margin-right: 4px;
    }
  }
  figcaption {
    font-size: ${SIZES.small}px;
    color: ${COLORS.muted};
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant }) =>
      $variant === "v1" &&
      css`
        width: auto;
        display: inline-flex;
        align-items: baseline;
        gap: 8px;
        margin-top: 16px;
        text-align: left;
        figure {
          margin: 0;
        }
      `}
    ${({ $variant, $odd }) =>
      $variant === "v2" &&
      css`
        width: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        margin: 12px 0 8px;
        background-color: ${$odd ? COLORS.white : COLORS.odd};
        border: 1px solid ${COLORS.border};
        border-radius: ${RADIUS}px;
        figure {
          margin: 0;
          order: 2;
        }
        figcaption {
          order: 1;
          font-size: ${SIZES.regular}px;
          color: ${COLORS.text};
        }
      `}
    ${({ $variant, $odd }) =>
      $variant === "v3" &&
      css`
        justify-self: end;
        align-self: start;
        width: 140px;
        margin-top: 44px;
        padding: 8px 12px;
        background-color: ${$odd ? COLORS.white : COLORS.odd};
        border: 1px solid ${COLORS.border};
        border-radius: ${RADIUS}px;
        figure {
          margin: 0 0 2px;
        }
      `}
  }
`
const Actions = styled.div<{ $variant: AccountProductVariant }>`
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
    ${({ $variant }) =>
      $variant === "v2" &&
      css`
        position: relative;
        top: auto;
        right: auto;
        grid-column: 2;
        grid-row: 1;
        justify-content: flex-end;
        margin-bottom: 8px;
      `}
  }
  svg {
    fill: ${COLORS.text};
    vertical-align: middle;
  }
`
const End = styled.div`
  font-weight: 400;
`
const Bottom = styled.div<{ $variant: AccountProductVariant }>`
  position: relative;
  em {
    font-size: ${SIZES.regular}px;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant }) =>
      ($variant === "v1" || $variant === "v3") &&
      css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      `}
    ${({ $variant }) =>
      $variant === "v2" &&
      css`
        grid-column: 2;
        grid-row: 2;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `}
  }
`
const BottomInfo = styled.div<{ $variant: AccountProductVariant }>`
  ${({ $variant }) =>
    ($variant === "v1" || $variant === "v3") &&
    css`
      @media (min-width: ${LAYOUT.mobile}px) {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    `}
`
const BottomRight = styled.div<{ $variant: AccountProductVariant }>`
  ${({ $variant }) =>
    ($variant === "v1" || $variant === "v3") &&
    css`
      @media (min-width: ${LAYOUT.mobile}px) {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
    `}
`
const BottomActions = styled.div<{ $variant: AccountProductVariant }>`
  ${aboveLink}
  button {
    margin: 10px 10px 0 0;
  }
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant }) =>
      ($variant === "v1" || $variant === "v3") &&
      css`
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        button {
          margin: 0;
        }
      `}
    ${({ $variant }) =>
      $variant === "v2" &&
      css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        margin-top: 12px;
        button {
          margin: 0;
          width: 100%;
        }
        em {
          text-align: center;
          color: ${COLORS.muted};
          font-size: ${SIZES.small}px;
        }
      `}
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
const Status = styled.div<{ $active: boolean; $variant: AccountProductVariant }>`
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant }) =>
      $variant === "current" &&
      css`
        position: absolute;
        top: 0;
        right: 0;
      `}
  }
  margin-bottom: ${({ $variant }) => ($variant === "current" ? "8px" : "4px")};
  color: ${({ $active }) => ($active ? COLORS.green : COLORS.red)};
  font-weight: 400;
  font-size: ${SIZES.subtitle}px;
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

const StyledSocialBar = styled(SocialShareBar)<{ $variant: AccountProductVariant }>`
  position: absolute;
  z-index: 1;
  right: -10px;
  top: -12px;
  @media (min-width: ${LAYOUT.mobile}px) {
    ${({ $variant }) =>
      $variant === "current"
        ? css`
            top: 26px;
          `
        : css`
            position: relative;
            right: auto;
            top: auto;
            padding: 0;
            justify-content: flex-start;
          `}
  }
`

interface Props {
  product: ProductEncoded
  odd?: boolean
  variant?: AccountProductVariant
}

const AccountProduct = ({ product, odd, variant = "current" }: Props) => {
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

  const slotsSection =
    slots.length > 0 ? (
      <SlotsBlock $variant={variant} $odd={odd}>
        <SlotsTitle>Créneaux</SlotsTitle>
        {upcomingSlots.length === 0 && !showAllSlots && <NoSlot>Aucun créneau à venir</NoSlot>}
        <ul>
          {visibleSlots.map(({ date, heureDebut, heureFin, reservation }) => {
            const key = getSlotKey(date, heureDebut, heureFin)
            const count = bookingsBySlot[key] ?? 0
            return (
              <SlotItem key={key} $past={getSlotEnd(date, heureFin) < now} $variant={variant} $odd={odd}>
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
    ) : variant === "v1" ? (
      <SlotsBlock $variant={variant} $odd={odd}>
        <SlotsTitle>Créneaux</SlotsTitle>
        <NoSlot>Aucun créneau renseigné</NoSlot>
      </SlotsBlock>
    ) : null

  const statsSection = (
    <Stats $variant={variant} $odd={odd}>
      <figure>
        <PointerIcon /> {product.views || 0}
      </figure>
      <figcaption>Nombre de vues</figcaption>
    </Stats>
  )

  return (
    <Container $odd={odd} $variant={variant}>
      <Ad $variant={variant}>
        <Image>
          <img src={product.photo} alt="" />
        </Image>
        <Days>
          Annonce créée le {formatDate(product.created)}
          {product.updated && <> et modifiée le {formatDate(product.updated)}</>}
        </Days>
        <Infos $variant={variant}>
          <h4>
            <Link href={`/annonce/${product.objectID}`}>{product.title}</Link>
          </h4>
          <ProductMeta $variant={variant}>{infos.filter((info) => info).join(" | ")}</ProductMeta>
          {(variant === "current" || variant === "v2") && slotsSection}
          {(variant === "current" || variant === "v1") && statsSection}
        </Infos>
        {variant === "v3" && statsSection}
        {(variant === "v1" || variant === "v3") && slotsSection}
      </Ad>
      <Actions $variant={variant}>
        <ButtonLink href={`/compte/producteur/annonce/${product.objectID}`}>Modifier</ButtonLink>
        <IconButton aria-label="Supprimer l’annonce" onClick={() => setModal("delete")}>
          <DeleteIcon />
        </IconButton>
      </Actions>
      {active ? (
        <Bottom $variant={variant}>
          <BottomInfo $variant={variant}>
            <Status $active={true} $variant={variant}>
              Annonce en ligne
            </Status>
            {variant === "current" && <StyledSocialBar $variant={variant} shareData={productShareData} />}
            <End>
              La publication se termine le {formatDateTime(product.expires)} ({daysFromNow(product.expires)})
            </End>
          </BottomInfo>
          {variant === "v2" && statsSection}
          <BottomRight $variant={variant}>
            {variant !== "current" && <StyledSocialBar $variant={variant} shareData={productShareData} />}
            <BottomActions $variant={variant}>
              <Button $variant="green" onClick={() => setModal("publish")}>
                Ajouter des jours
              </Button>
              <Button onClick={() => setModal("disable")}>Désactiver l’annonce</Button>
              <em>Vous pourrez la réactiver</em>
            </BottomActions>
          </BottomRight>
        </Bottom>
      ) : (
        <Bottom $variant={variant}>
          <BottomInfo $variant={variant}>
            {product.expires ? (
              <>
                <Status $active={false} $variant={variant}>
                  Annonce terminée
                </Status>
                <End>La publication s’est terminée le {formatDateTime(product.expires)}</End>
              </>
            ) : (
              <>
                <Status $active={false} $variant={variant}>
                  Annonce désactivée
                </Status>
                <End>
                  {product.disabled
                    ? `La publication a été désactivée le ${formatDateTime(product.disabled)}`
                    : "La publication est désactivée"}
                </End>
              </>
            )}
          </BottomInfo>
          {variant === "v2" && statsSection}
          <BottomRight $variant={variant}>
            <BottomActions $variant={variant}>
              <Button $variant="green" onClick={() => setModal("publish")}>
                Publier l’annonce
              </Button>
            </BottomActions>
          </BottomRight>
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
