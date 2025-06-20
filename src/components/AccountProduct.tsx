import styled from "@emotion/styled"
import DeleteIcon from "@mui/icons-material/Delete"
import EditIcon from "@mui/icons-material/Edit"
import { IconButton } from "@mui/material"
import { Schema as Sc } from "effect"
import { useState } from "react"
import PointerIcon from "src/assets/pointer.svg"
import { Button } from "src/components/Button"
import { BasicInput, Form, SubmitButton } from "src/components/Form"
import Link from "src/components/Link"
import Modal from "src/components/Modal"
import ProductEndDate from "src/components/ProductEndDate"
import { SocialShareBar } from "src/components/SocialShareBar/SocialShareBar"
import { COLORS, LAYOUT, MAX_PUBLICATION_DAYS, SIZES } from "src/constants"
import api from "src/helpers/api"
import { daysFromNow, formatDate, formatDateTime } from "src/helpers/date"
import { formatAmount, formatQuantity } from "src/helpers/text"
import { SlotSchemaFirestore } from "src/pages/compte/producteur/annonce"
import type { Product } from "src/types/model"

const Container = styled.div<{ $odd?: boolean }>`
  position: relative;
  margin: 20px 0;
  background-color: ${({ $odd }) => ($odd ? COLORS.odd : COLORS.white)};
  padding: 20px;
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 0 -24px;
  }
`
const Ad = styled.div`
  display: flex;
  @media (min-width: ${LAYOUT.mobile}px) {
    margin-bottom: 15px;
    padding-bottom: 20px;
    border-bottom: 1px solid ${COLORS.border};
  }
`
const Image = styled.div`
  flex-shrink: 0;
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
  margin: 0 20px;
  h4 {
    font-size: 18px;
    font-weight: normal;
    margin: 0 0 5px;
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 0 0 0 12px;
  }
`
const Days = styled.div`
  margin: 15px 0;
  color: ${COLORS.grey};
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 8px 0;
    font-size: 0.9em;
  }
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
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (min-width: ${LAYOUT.mobile}px) {
    width: auto;
    position: absolute;
    top: 12px;
    right: 12px;
  }
  a {
    padding: 12px;
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
  right: -10px;
  top: -12px;
  @media (min-width: ${LAYOUT.mobile}px) {
    top: 26px;
  }
`

interface Props {
  product: Product
  odd?: boolean
}

const AccountProduct = ({ product, odd }: Props) => {
  const [modal, setModal] = useState<null | "publish" | "disable" | "delete">(null)
  const infos = [formatAmount(product.price), formatQuantity(product), product.city]
  const active = product.expires ? product.expires > Date.now() : false

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

  const slots = product.slots ? Sc.decodeUnknownSync(Sc.Array(SlotSchemaFirestore))(product.slots) : []
  //const slots = []
  return (
    <Container $odd={odd}>
      <Ad>
        <Image>
          <img src={product.photo} />
        </Image>
        <Infos>
          <h4>{product.title}</h4>
          <div>{infos.filter((info) => info).join(" | ")}</div>
          {slots.length > 0 && (
            <div>
              <h5>Créneaux</h5>
              {slots.map(({ date, heureDebut, heureFin }) => (
                <p key={date.toString()}>
                  Le {date.toLocaleDateString()} de {heureDebut} à {heureFin}
                </p>
              ))}
            </div>
          )}

          <Days>
            Annonce créée le {formatDate(product.created)}
            {product.updated && <> et modifiée le {formatDate(product.updated)}</>}
          </Days>
          <Stats>
            <figure>
              <PointerIcon /> {product.views || 0}
            </figure>
            <figcaption>Nombre de clics</figcaption>
          </Stats>
        </Infos>
      </Ad>
      <Actions>
        <Link href={`/compte/producteur/annonce/${product.objectID}`}>
          <EditIcon />
        </Link>
        <IconButton onClick={() => setModal("delete")}>
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
          <Status $active={false}>Annonce désactivée</Status>
          <End>La publication est désactivée</End>
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
              <p>Supprimer l’annonce ?</p>
              <SubmitButton />
            </Form>
          )}
        </Modal>
      )}
    </Container>
  )
}

export default AccountProduct
