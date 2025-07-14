import styled from "@emotion/styled"
import React from "react"
import IconHeartEmpty from "src/assets/icon-heart-empty.svg"
import IconHeart from "src/assets/icon-heart.svg"
import { FloatingTag } from "src/components/Tag"
import { COLORS } from "src/constants"
import { useUser } from "src/helpers/auth"
import { useHover } from "src/helpers/hover"
import { formatPrice, formatPricePerUnit, formatQuantity } from "src/helpers/text"
import { isFollowed } from "src/helpers/user"
import { ProductEncoded } from "src/models/Product"

const Container = styled.div<{ $hover: boolean }>`
  box-shadow: 0px 3px 3px ${({ $hover }) => ($hover ? COLORS.green : COLORS.shadow.light)};
`
const CardLink = styled.div`
  position: relative;
  display: block;
`
const Image = styled.img`
  display: block;
  width: 100%;
  height: 180px;
  object-fit: cover;
`
const Content = styled.div`
  position: relative;
`

const FollowHover = styled.div`
  display: none;
  position: absolute;
  top: -40px;
  right: -5px;
  padding: 5px 10px;
  background-color: #101010;
  color: white;
  font-size: 10px;
`

const Follow = styled.div`
  position: absolute;
  top: -15px;
  right: 30px;
  padding: 10px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0px 3px 6px #00000029;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover + ${FollowHover} {
    display: block;
  }
`

const Title = styled.h2<{ $margin?: boolean }>`
  padding: 0.2em 10px 0;
  margin: ${({ $margin }) => ($margin ? "0 70px 0 0" : "0")};
  font-size: 1.4em;
`
const ProducerLink = styled.a`
  display: block;
  margin: 0.2em 10px;
  font-weight: 300;
  color: ${COLORS.producer.link.color.default};
  &:hover {
    color: ${COLORS.producer.link.color.hover};
  }
`
const Location = styled.h4`
  margin: 0;
  padding: 0 10px 0.2em;
  font-weight: 300;
`
const Price = styled.div`
  padding: 2px 10px 6px;
  font-size: 1.2em;
`
const PPU = styled.div`
  position: absolute;
  right: 10px;
  bottom: 6px;
  font-size: 1.2em;
  font-weight: 400;
`
const Quantity = styled.div`
  position: absolute;
  right: 10px;
  bottom: calc(10px + 2em);
  font-size: 0.8em;
  font-weight: 400;
`

const StyledFloatingTag = styled(FloatingTag)`
  position: absolute;
  right: 0;
  left: auto;
`

interface Props {
  product: ProductEncoded
  followButton?: boolean
}

export const ProductInfos = ({ product, followButton }: Props) => {
  const { user, toggleFollow } = useUser()
  const followed = isFollowed(product.uid, user)

  const handleFollow = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    toggleFollow(product.uid, !followed)
  }

  const productUrl = `/annonce/${product.objectID}`
  const producerUrl = `/producteur/${product.uid}`

  return (
    <CardLink>
      <a href={productUrl}>
        <Image src={product.photo} alt="" />
        {product.bio && <StyledFloatingTag>Bio / raisonnée</StyledFloatingTag>}
      </a>
      <Content>
        {followButton && (
          <>
            <Follow onClick={handleFollow}>{followed ? <IconHeart /> : <IconHeartEmpty />}</Follow>
            <FollowHover>{followed ? "Ne plus suivre le producteur" : "Suivre le producteur"}</FollowHover>
          </>
        )}
        <a href={productUrl}>
          <Title $margin={followButton}>{product.title}</Title>
        </a>
        <ProducerLink href={producerUrl}>{product.producer}</ProducerLink>
        <a href={productUrl}>
          <Location>
            {product.city}
            {product.dpt && <> ({product.dpt})</>}
          </Location>
          <Price>{formatPrice(product)}</Price>
          {product.quantity && product.unit && (
            <>
              <PPU>{formatPricePerUnit(product)}</PPU>
              <Quantity>{formatQuantity(product)}</Quantity>
            </>
          )}
        </a>
      </Content>
    </CardLink>
  )
}

const ProductCard = ({ product, followButton }: Props) => {
  const { productId, setProduct } = useHover()

  return (
    <Container
      onMouseOver={() => setProduct(product.objectID)}
      onMouseOut={() => setProduct(null)}
      $hover={productId === product.objectID}
    >
      <ProductInfos product={product} followButton={followButton} />
    </Container>
  )
}

export default ProductCard
