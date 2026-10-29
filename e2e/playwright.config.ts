import { existsSync, readFileSync } from "fs"
import { join } from "path"
import type { PlaywrightTestConfig } from "@playwright/test"

// Chargement manuel de e2e/.env (pas de dépendance dotenv dans ce paquet isolé).
// Les variables déjà présentes dans l'environnement ne sont pas écrasées.
const envPath = join(__dirname, ".env")
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
    }
  }
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000"

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  // Exécution séquentielle et ordonnée : les projets sont lancés dans l'ordre de la liste
  // (consultation → authentification → publication → reservations → compte). La publication
  // crée l'annonce de test, les réservations la consomment puis la suppriment.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    actionTimeout: 15000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "consultation", testMatch: /consultation\.spec\.ts/ },
    { name: "authentification", testMatch: /authentification\.spec\.ts/ },
    { name: "publication", testMatch: /publication\.spec\.ts/ },
    { name: "reservations", testMatch: /reservations\.spec\.ts/ },
    { name: "compte", testMatch: /compte\.spec\.ts/ },
  ],
  // Contre un serveur distant (dev), pas de webServer local : la variable E2E_BASE_URL
  // l'active et le build local n'est pas nécessaire.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "yarn serve",
          cwd: "..",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120000,
        },
      }),
}

export default config
