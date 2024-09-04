import styled from "@emotion/styled"
import React, { useState } from "react"
import CheckIcon from "src/assets/check-circle.svg"
import InfoIcon from "src/assets/info.svg"
import CloseCirce from "src/assets/x-circle.svg"
import { COLORS, LAYOUT, SIZES } from "src/constants"

type MessageType = "success" | "info"

const Container = styled.div<{ $type: MessageType }>`
  display: flex;
  align-items: center;
  margin: 0 auto;
  width: 70%;
  padding: 20px 30px;
  border-radius: 10px;
  background-color: ${({ $type }) => COLORS.background[$type]};
  position: relative;

  @media (max-width: ${LAYOUT.mobile}px) {
    width: 100%;
    padding: 10px 15px;
  }
`
const Content = styled.div`
  margin-left: 20px;
  flex: 1;

  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 0 10px;
  }
`
const Title = styled.span`
  color: ${COLORS.green};
  font-weight: bold;
  font-size: ${SIZES.large}px;

  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: ${SIZES.regular}px;
  }
`

const Text = styled.div`
  margin-top: 10px;
  font-size: ${SIZES.large}px;

  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: ${SIZES.regular}px;
  }
`

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
`

interface SuccessProps {
  title?: string
  type: MessageType
  children: React.ReactNode
}

const Message: React.FC<SuccessProps> = ({ title, type, children }) => {
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return null
  }

  return (
    <Container $type={type}>
      <CloseButton onClick={() => setVisible(false)}>
        <CloseCirce />
      </CloseButton>
      {type === "success" && <CheckIcon />}
      {type === "info" && <InfoIcon />}
      <Content>
        {title && <Title>{title}</Title>}
        <Text>{children}</Text>
      </Content>
    </Container>
  )
}

export default Message
