import Layout from "src/layout"
import styled from "@emotion/styled"
import { LAYOUT } from "src/constants"
import { auth } from "src/helpers/firebase"

const Title = styled.h1`
  text-align: center;
  font-size: 1.7em;
  font-weight: 500;
  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: 14px;
    margin: 0.5em -16px;
  }
`
const Link = styled.h1`
  text-align: center;
  font-size: 1em;
  font-weight: 300;
  cursor: pointer;
  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: 14px;
    margin: 0.5em -16px;
  }
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
      <Link>
        <button onClick={() => handleGetCSV("buyers")}>{"Acheteurs"}</button>
      </Link>
      <Link>
        <button onClick={() => handleGetCSV("producers")}>{"Producteurs"}</button>
      </Link>
    </Layout>
  )
}

export default CSVExport
