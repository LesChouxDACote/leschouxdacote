import { expect, test } from "@playwright/test"

import { ACCOUNTS, hasAccounts } from "../helpers/config"
import { login, openUserMenu } from "../helpers/auth"
import { acceptDialogs, expectAlertTimes } from "../helpers/dialogs"

// Parcours « compte » : profil acheteur/producteur et alertes.

test.describe("Compte", () => {
  test.beforeEach(() => {
    test.skip(!hasAccounts(), "Comptes de test absents (TEST_BUYER_*/TEST_PRODUCER_* non renseignés)")
  })

  test("l'acheteur modifie son profil", async ({ page }) => {
    const messages = acceptDialogs(page)
    await login(page, "buyer")
    await openUserMenu(page)
    await page.getByRole("link", { name: "Mon profil" }).click()
    await expect(page.locator('input[name="email"]')).toBeDisabled()
    await expect(page.locator('input[name="email"]')).toHaveValue(ACCOUNTS.buyer.email)
    // Les champs producteur n'apparaissent pas pour un acheteur.
    await expect(page.locator('input[name="name"]')).toHaveCount(0)
    // Modification du prénom, puis retour à la valeur d'origine (données de dev réelles).
    const firstname = page.locator('input[name="firstname"]')
    const original = await firstname.inputValue()
    await firstname.fill("Prénom E2E")
    await page.getByRole("button", { name: "Valider" }).click()
    expectAlertTimes(messages, "Modifications effectuées", 1)
    await firstname.fill(original)
    await page.getByRole("button", { name: "Valider" }).click()
    expectAlertTimes(messages, "Modifications effectuées", 2)
    await expect(firstname).toHaveValue(original)
  })

  test("les alertes de l'acheteur listent ses producteurs favoris", async ({ page }) => {
    await login(page, "buyer")
    await page.goto("/compte/alertes")
    await expect(page.getByRole("heading", { name: "Mes alertes utilisateur" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Liste des producteurs favoris" })).toBeVisible()
    await expect(page.getByText(/producteur(s)? artisan(s)? en favoris/)).toBeVisible()
    // La section « alertes producteur » est réservée aux producteurs.
    await expect(page.getByText("Mes alertes producteur")).toHaveCount(0)
  })

  test("le compte producteur affiche ses onglets et son profil complet", async ({ page }) => {
    await login(page, "producer")
    await expect(page).toHaveURL(/\/compte\/producteur\/annonces/)
    for (const name of ["Toutes mes annonces", "Annonces en ligne", "Annonces désactivées"]) {
      await page.getByRole("button", { name: new RegExp(name) }).click()
    }
    await expect(page.getByRole("link", { name: "Créer une annonce" }).first()).toBeVisible()
    await page.goto("/compte/profil")
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
  })
})
