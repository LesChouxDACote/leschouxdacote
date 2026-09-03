import styled from "@emotion/styled"
import LogoSvg from "src/assets/logo.svg"
import SearchBar, { BioSwitchLabelContainer } from "src/components/SearchBar"
import { COLORS, LAYOUT } from "src/constants"
import Layout from "src/layout"

const Logo = styled(LogoSvg)`
  display: block;
  margin: 2vh auto;
  max-width: 500px;
  @media (max-width: ${LAYOUT.mobile}px) {
    margin: 0 auto;
    width: 100%;
  }
`
const Title = styled.h1`
  text-align: center;
  font-size: 1.7em;
  font-weight: 500;
  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: 14px;
    margin: 0.5em -16px;
  }
`
const Introduction = styled.p`
  text-align: center;
  font-size: 1.2em;
  strong,
  b {
    color: ${COLORS.green};
  }
  @media (max-width: ${LAYOUT.mobile}px) {
    font-size: 14px;
    margin: 0.5em -16px;
  }
`
const SearchGroup = styled(SearchBar)`
  margin: 5vh auto;
  text-align: center;

  input {
    padding: 16px 32px;
    font-size: 1.5em;
    box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.16);
    @media (max-width: ${LAYOUT.mobile}px) {
      padding: 12px 16px;
      font-size: 1.2em;
      margin: 8px 0;
    }
  }
  button {
    height: 48px;
    @media (max-width: ${LAYOUT.mobile}px) {
      width: auto;
      display: inline-flex;
      margin: 8px auto;
      padding: 0 20px;
      box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.16);
      justify-content: space-between;
      order: 2; // Move below the "bio" switch
      span {
        display: block;
        font-size: 1.2em;
        margin-right: 16px;
      }
      svg {
        width: auto;
      }
    }
    @media (min-width: ${LAYOUT.mobile}px) {
      width: 48px;
      right: 10px;
      top: 7px;
    }
  }
  ${BioSwitchLabelContainer} {
    @media (max-width: ${LAYOUT.mobile}px) {
      order: 1; // Move above the submit button
      background: white;
      box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.16);
      margin: 8px auto;
      padding-left: 20px;
    }

    .MuiFormControlLabel-label {
      font-weight: 300;
      font-size: 1.2rem;
    }
  }
`

const HomePage = () => {
  return (
    <Layout bgImage>
      <Logo />
      <Title>
        Pourquoi les carottes sont-elles bio ? Parce qu&apos;elles n&apos;ont jamais fait de mauvaises rencontres.
      </Title>
      <a href="https://info.leschouxdacote.fr/" target="_blank" rel="noreferrer">
        <Introduction>
          <strong>Producteurs de produits alimentaires</strong>, augmentez vos <strong>ventes directes</strong> en
          publiant gratuitement des annonces.
          <br />
          <b>Acheteurs</b>, découvrez les <strong>produits locaux en circuit court </strong> près de chez vous.
        </Introduction>
      </a>
      <SearchGroup />
    </Layout>
  )
}

export default HomePage
