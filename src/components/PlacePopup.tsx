import styled from "@emotion/styled"
import PrevIcon from "@mui/icons-material/NavigateBefore"
import NextIcon from "@mui/icons-material/NavigateNext"
import { forwardRef, useEffect, useState } from "react"
import { ProductInfos } from "src/cards/ProductCard"
import { COLORS, LAYOUT } from "src/constants"
import { useHover } from "src/helpers/hover"
import { ProductEncoded } from "src/models/Product"

const PopupContent = styled.div`
  width: ${LAYOUT.mapPopupWidth}px;
  white-space: nowrap;
  overflow: hidden;
`
const Slider = styled.div`
  transition: transform 200ms ease-in-out;
  > div {
    white-space: normal;
    display: inline-block;
    vertical-align: top;
    width: 100%;
    img {
      height: 120px;
    }
  }
`
const Nav = styled.nav`
  display: flex;
  align-items: center;
  text-align: center;
  font-size: 13px;
  border-top: 1px solid ${COLORS.border};
  button {
    height: 34px;
    border: none;
    background-color: transparent;
    padding: 5px;
  }
  div {
    flex: 1;
  }
`

interface PlaceProps {
  products: ProductEncoded[]
}

const PlacePopup = forwardRef<HTMLDivElement, PlaceProps>(({ products }, ref) => {
  const [index, setIndex] = useState(0)
  const { setProduct } = useHover()

  useEffect(() => {
    setIndex(0)
  }, [products])

  const current = products[index]?.objectID

  useEffect(() => {
    setProduct(current)
  }, [setProduct, current])

  if (!current) {
    return <PopupContent ref={ref} />
  }

  return (
    <PopupContent ref={ref}>
      <Slider style={{ transform: `translateX(${-LAYOUT.mapPopupWidth * index}px)` }}>
        {products.map((product) => (
          <ProductInfos key={product.objectID} product={product} />
        ))}
      </Slider>
      {products.length > 1 && (
        <Nav>
          <button onClick={() => setIndex(Math.max(0, index - 1))}>
            <PrevIcon />
          </button>
          <div>
            {index + 1}/{products.length}
          </div>
          <button onClick={() => setIndex(Math.min(products.length - 1, index + 1))}>
            <NextIcon />
          </button>
        </Nav>
      )}
    </PopupContent>
  )
})

PlacePopup.displayName = "PlacePopup"

export default PlacePopup
