import styled from "@emotion/styled"
import { FC } from "react"
import { Button } from "src/components/Button"
import Modal from "src/components/Modal"

const Title = styled.h2`
  margin: 0 0 10px;
`

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
`

export interface Props {
  onStay: () => void
  onLeave: () => void
}

const UnsavedChangesModal: FC<Props> = ({ onStay, onLeave }) => (
  <Modal onClose={onStay}>
    <>
      <Title>Modifications non enregistrées</Title>
      <p>Vous avez des modifications non enregistrées. Voulez-vous quitter sans les sauvegarder ?</p>
      <Buttons>
        <Button $variant="green" type="button" onClick={onStay}>
          Rester sur la page
        </Button>
        <Button $variant="red" type="button" onClick={onLeave}>
          Quitter sans enregistrer
        </Button>
      </Buttons>
    </>
  </Modal>
)

export default UnsavedChangesModal
