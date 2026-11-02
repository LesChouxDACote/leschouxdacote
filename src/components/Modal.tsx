import styled from "@emotion/styled"
import { FC, MouseEvent, useEffect } from "react"
import Portal from "src/components/Portal"
import { COLORS, LAYOUT, RADIUS } from "src/constants"

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${COLORS.shadow.overlay};
  z-index: 10;
  backdrop-filter: blur(2px);
`
const Box = styled.div`
  width: 600px;
  max-width: 80%;
  margin: 30vh auto 0;
  background-color: ${COLORS.white};
  border-radius: ${RADIUS}px;
  box-shadow: 0px 3px 6px ${COLORS.shadow.regular};
  position: relative;
  padding: 5px;
  @media (max-width: ${LAYOUT.mobile}px) {
    max-width: calc(100% - 32px);
  }
`
const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 15px;
  font-size: 32px;
  font-weight: 300;
  padding: 2px 5px 6px;
  line-height: 20px;
`
const Content = styled.div`
  max-height: 50vh;
  overflow-y: auto;
  padding: 20px;
  text-align: center;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding-bottom: 0;
  }
`

export interface Props {
  onClose: () => void
  children: React.ReactNode
}

const Modal: FC<Props> = ({ onClose, children }) => {
  useEffect(() => {
    const onKeyPress = ({ key }: KeyboardEvent) => {
      if (key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", onKeyPress, false)
    return () => {
      document.removeEventListener("keydown", onKeyPress, false)
    }
  }, [onClose])

  const handleOverlayClick = ({ target, currentTarget }: MouseEvent<HTMLDivElement>) => {
    if (target === currentTarget) {
      onClose()
    }
  }

  return (
    <Portal>
      <Overlay onClick={handleOverlayClick}>
        <Box>
          <CloseButton onClick={onClose}>×</CloseButton>
          <Content>{children}</Content>
        </Box>
      </Overlay>
    </Portal>
  )
}

export default Modal
