import styled from "@emotion/styled"
import { Button } from "src/components/Button"
import { auth } from "src/helpers/firebase"
import Layout from "src/layout"

const Title = styled.h1`
  text-align: center;
`
const Actions = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`

export const CSVExport = () => {
  const handleGetCSV = async (users: "producers" | "buyers") => {
    const headers = new Headers()
    headers.set("Accept", "application/json")
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      headers.set("X-Token", token)
    }
    const response = await fetch(`/api/export?q=${users}`, { headers })
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const date = new Date().toISOString().substr(0, 10)
    a.download = `${users}-${date}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Layout title="Export des CSVs">
      <Title>Export des CSVs</Title>
      <Actions>
        <Button $variant="green" onClick={() => handleGetCSV("buyers")}>
          Acheteurs
        </Button>
        <Button $variant="green" onClick={() => handleGetCSV("producers")}>
          Producteurs
        </Button>
      </Actions>
    </Layout>
  )
}

export default CSVExport
