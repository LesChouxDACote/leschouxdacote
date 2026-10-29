import { expect, Page } from "@playwright/test"

import { ACCOUNTS, Role } from "./config"

export async function login(page: Page, role: Role) {
  await page.goto("/connexion")
  await page.locator('input[name="email"]').fill(ACCOUNTS[role].email)
  await page.locator('input[name="password"]').fill(ACCOUNTS[role].password)
  await page.getByRole("button", { name: "Se connecter" }).click()
  // Redirection selon le rôle : producteur → /compte/producteur/annonces, acheteur → /
  await expect(page).not.toHaveURL(/\/connexion/)
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeHidden()
}

export async function openUserMenu(page: Page) {
  // Sur l'accueil, le header (desktop) ne contient ni barre de recherche ni logo : le bouton
  // du menu utilisateur est le seul bouton du header une fois connecté.
  await page.goto("/")
  const menuButton = page.locator("header").getByRole("button").first()
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await page.getByText("Mon profil").first().waitFor()
}

export async function logout(page: Page) {
  // « Se déconnecter » est un <a> sans href dans le menu : pas de rôle accessible « link ».
  await page.getByText("Se déconnecter").first().click()
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible()
}
