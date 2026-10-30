import { css, Global } from "@emotion/react"
import styled from "@emotion/styled"
import { AppProps } from "next/app"
import Head from "next/head"
import { ErrorInfo } from "react"
import CookieBanner from "src/components/CookieBanner"
import "src/components/Nprogress"
import { FONT, LAYOUT } from "src/constants"
import { UserProvider } from "src/helpers/auth"
import { ErrorBoundary } from "src/helpers/bugsnag"
import { ConsentProvider } from "src/helpers/consent"

const globalStyle = css`
  :root {
    --header-height: 80px;
    @media (max-width: ${LAYOUT.mobile}px) {
      --header-height: 60px;
    }
  }

  html {
    scroll-padding-top: calc(var(--header-height) + 30px);
    box-sizing: border-box;
  }
  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }

  html,
  body {
    padding: 0;
    margin: 0;
    font-weight: 300;
  }

  * {
    font-family: ${FONT};
  }

  a {
    color: inherit;
    text-decoration: none;
  }
  h1 {
    font-size: 1.7em;
    font-weight: 500;
    margin: 0 0 24px;
  }
  h2 {
    font-size: 1.2em;
    font-weight: 400;
  }

  button {
    cursor: pointer;
    font-size: inherit;
    outline: none;
    background-color: transparent;
    border: none;
  }

  figure {
    margin: 0;
  }
`

const ErrorContainer = styled.div`
  font-family: ${FONT};
  padding: 2em 1em;
  h1 {
    color: #e10f14;
  }
  code {
    display: block;
    margin-top: 8em;
    color: #aaa;
  }
`

// https://github.com/bugsnag/bugsnag-js/blob/next/packages/plugin-react/types/bugsnag-plugin-react.d.ts
interface FallbackProps {
  error: Error
  info: ErrorInfo
  clearError: () => void
}

const ErrorComponent = ({ error }: FallbackProps) => (
  <ErrorContainer>
    <h1>
      <span aria-hidden>🐞</span>
      <br />
      Une erreur est survenue
    </h1>
    <h2>Essayez de recharger la page</h2>
    <code>{String(error)}</code>
  </ErrorContainer>
)

const MyApp = ({ Component, pageProps }: AppProps) => {
  const children = (
    <>
      <Global styles={globalStyle} />
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, shrink-to-fit=no" />
      </Head>
      <ConsentProvider>
        <UserProvider>
          <Component {...pageProps} />
          <CookieBanner />
        </UserProvider>
      </ConsentProvider>
    </>
  )

  return ErrorBoundary ? <ErrorBoundary FallbackComponent={ErrorComponent}>{children}</ErrorBoundary> : children
}

export default MyApp
