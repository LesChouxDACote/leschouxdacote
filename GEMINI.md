# GEMINI.md - Les Choux d'à Côté

This document provides a technical overview of the "Les Choux d'à Côté" project, a web application for classified food ads.

## Project Overview

"Les Choux d'à Côté" is a full-stack web application built with **Next.js**, **React**, and **TypeScript**. It serves as a platform for local food producers to post classified ads for their products, allowing consumers to find and purchase local goods directly.

### Core Technologies

-   **Framework**: [Next.js](https://nextjs.org/) (v12)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI Library**: [React](https://reactjs.org/) (v17)
-   **Styling**: [Emotion](https://emotion.sh/) (`@emotion/styled`) for CSS-in-JS.
-   **Database**: [Google Firestore](https://firebase.google.com/docs/firestore) is the primary database. Connection and data fetching logic are centralized in `src/helpers/firebase.ts`, which provides custom hooks (`useQuery`, `useObjectQuery`).
-   **Search**: [Algolia](https://www.algolia.com/) is used for product search.
-   **Deployment**: The application is deployed on [Vercel](https://vercel.com/).
-   **Package Manager**: [Yarn](https://yarnpkg.com/) (v4)

### Architecture

-   **Frontend**: The application follows a standard Next.js structure.
    -   Pages are located in `src/pages`.
    -   The main application shell is in `src/pages/_app.tsx`, which sets up global styles, the `UserProvider` for authentication context, and an `ErrorBoundary` for bug reporting.
    -   Reusable UI components are in `src/components` and `src/cards`.
-   **Backend**: Backend logic is handled by:
    -   Next.js API routes located in `src/pages/api/`.
    -   Server-side scripts in `src/scripts/` for scheduled tasks (e.g., `alerts.ts`, `expired.ts`), executed via `ts-node`.
-   **Data Modeling**: Data schemas are defined using `effect/Schema` (e.g., `src/models/Product.ts`), ensuring strong type safety for core data structures.

## Getting Started

### Prerequisites

-   Node.js (>= v20)
-   Yarn (v4.5.x)

### Configuration

1.  Copy the example environment file:
    ```bash
    cp example.env .env
    ```
2.  Populate the `.env` file with the necessary API keys and credentials for Firebase, Algolia, Bugsnag, and other services as outlined in the `README.md`.

## Key Commands

-   **Install dependencies:**
    ```bash
    yarn
    ```
-   **Run the development server:**
    ```bash
    yarn dev
    ```
    The application will be available at `http://localhost:3000`.

-   **Create a production build:**
    ```bash
    yarn build
    ```

-   **Start the production server:**
    ```bash
    yarn serve
    ```

-   **Run linter and formatter:**
    ```bash
    yarn lint
    ```
    This command is configured with `lint-staged` and runs automatically on pre-commit.

-   **Execute utility scripts:**
    Scripts for sending email alerts or updating tags are run with `ts-node`.
    ```bash
    # Example:
    yarn email-alerts
    ```

## Development Conventions

-   **Styling**: All styling is done using `@emotion/styled`. Global and theme constants (colors, layout breakpoints) are defined in `src/constants/index.ts`.
-   **State Management**: Authentication state is managed via a React Context (`UserProvider` in `src/helpers/auth.tsx`). For server state, the custom hooks in `src/helpers/firebase.ts` are used for direct data fetching.
-   **Coding Style**: Code formatting and quality are enforced by **ESLint** and **Prettier**. Configuration can be found in `.eslintrc.js` and `prettier.config.js`. A pre-commit hook is set up in `.husky/pre-commit` to ensure all committed code is linted.
-   **SVGs**: SVG files in `src/assets` are imported and used as React components via `@svgr/webpack`, as configured in `next.config.js`.
-   **Data Fetching**: Data from Firestore is fetched using the custom `useQuery` and `useObjectQuery` hooks found in `src/helpers/firebase.ts`. These hooks handle loading states and data transformation.
