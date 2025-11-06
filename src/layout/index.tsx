import styled from "@emotion/styled"
import { FC } from "react"
import { Loading } from "src/components/Loader"
import SEO, { SEOProps } from "src/components/Seo"
import { LAYOUT } from "src/constants"
import { useUser } from "src/helpers/auth"
import Footer from "./footer"
import Header from "./header"

const Empty = styled.div`
  min-height: 100vh;
  padding-top: var(--header-height);
  position: relative;
`
const Background = styled(Empty)`
  background-image: url("/background.svg");
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: contain;
  @media (max-width: ${LAYOUT.mobile}px) {
    background-size: 180%;
  }
  @media (orientation: portrait) and (max-height: 700px) {
    background-size: 120%;
  }
`

const MainColumn = styled.main`
  max-width: ${LAYOUT.maxWidth}px;
  margin: 0 auto;
  padding: 32px;
  @media (max-width: ${LAYOUT.mobile}px) {
    padding: 24px;
  }
`

interface Props {
  bgImage?: boolean
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
}

const Layout: FC<Props & SEOProps> = ({ bgImage, fullWidth, loading, children, ...props }) => {
  const { wait } = useUser()

  const Container = bgImage ? Background : Empty
  const Main = fullWidth ? "main" : MainColumn

  return (
    <>
      <SEO {...props} />
      <Header />
      <Container>
        <Main>{loading || wait ? <Loading /> : children}</Main>
      </Container>
      <Footer />
    </>
  )
}

export default Layout
