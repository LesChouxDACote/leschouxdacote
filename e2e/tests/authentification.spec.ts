import { expect, test } from "@playwright/test"

import { ACCOUNTS, hasAccounts } from "../helpers/config"
import { login, logout, openUserMenu } from "../helpers/auth"

// Parcours d'authentification : connexion par rôle, erreurs, inscription, mot de passe
// oublié, déconnexion, gardes d'accès. Nécessite les deux comptes de test du PO.

test.describe("Authentification", () => {
  test.beforeEach(() => {
    test.skip(!hasAccounts(), "Comptes de test absents (TEST_BUYER_*/TEST_PRODUCER_* non renseignés)")
  })

  test("l'acheteur se connecte et accède au menu utilisateur", async ({ page }) => {
    await login(page, "buyer")
    await expect(page).toHaveURL("/")
    await openUserMenu(page)
    await expect(page.getByText("Mes réservations").first()).toBeVisible()
    await expect(page.getByText("Mes annonces")).toHaveCount(0)
  })

  test("le producteur se connecte et arrive sur ses annonces", async ({ page }) => {
    await login(page, "producer")
    await expect(page).toHaveURL(/\/compte\/producteur\/annonces/)
    await expect(page.getByRole("heading", { name: "Mes annonces" })).toBeVisible()
  })

  test("un mot de passe erroné affiche une erreur", async ({ page }) => {
    await page.goto("/connexion")
    await page.locator('input[name="email"]').fill(ACCOUNTS.buyer.email)
    await page.locator('input[name="password"]').fill("mot-de-passe-errone")
    await page.getByRole("button", { name: "Se connecter" }).click()
    await expect(page.getByText("Le mot de passe est incorrect")).toBeVisible()
    await expect(page).toHaveURL(/\/connexion/)
  })

  test("une adresse inconnue affiche une erreur", async ({ page }) => {
    await page.goto("/connexion")
    await page.locator('input[name="email"]').fill("inconnu@test-e2e.leschouxdacote.fr")
    await page.locator('input[name="password"]').fill("MotDePasse1")
    await page.getByRole("button", { name: "Se connecter" }).click()
    await expect(page.getByText("L'adresse e-mail est inconnue")).toBeVisible()
    await expect(page).toHaveURL(/\/connexion/)
  })

  test("l'inscription bascule entre producteur et acheteur", async ({ page }) => {
    await page.goto("/inscription")
    // Par défaut : producteur, SIRET visible.
    await expect(page.getByText("SIRET")).toBeVisible()
    await page.getByText("Je suis un acheteur").click()
    await expect(page.getByText("SIRET")).toBeHidden()
    await page.getByText("Je suis un producteur").click()
    await expect(page.getByText("SIRET")).toBeVisible()
  })

  test("l'inscription valide le mot de passe côté client", async ({ page }) => {
    await page.goto("/inscription")
    await page.getByText("Je suis un acheteur").click()
    await page.locator('input[name="firstname"]').fill("Test")
    await page.locator('input[name="lastname"]').fill("E2E")
    await page.locator('input[name="email"]').fill("test-e2e@leschouxdacote.fr")
    await page.locator('input[name="password"]').fill("Ab1")
    await page.getByRole("button", { name: "Valider" }).click()
    // minLength est celui du navigateur : il bloque l'envoi avec sa propre bulle, sans texte dans la page
    const password = page.locator('input[name="password"]')
    expect(await password.evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true)
    await expect(page).toHaveURL(/\/inscription/)
  })

  test("le mot de passe oublié envoie un lien de réinitialisation", async ({ page }) => {
    await page.goto("/mot-de-passe-oublie")
    await page.locator('input[name="email"]').fill(ACCOUNTS.buyer.email)
    await page.getByRole("button", { name: "Valider" }).click()
    await expect(page.getByText("Veuillez cliquer sur le lien de réinitialisation")).toBeVisible()
  })

  test("l'utilisateur se déconnecte", async ({ page }) => {
    await login(page, "buyer")
    await openUserMenu(page)
    await logout(page)
    await expect(page).toHaveURL("/")
  })

  test("les pages du compte sont protégées pour les anonymes", async ({ page }) => {
    await page.goto("/compte/reservations")
    await expect(page).toHaveURL(/\/connexion\?next=/)
    await expect(page.getByText("Vous devez vous connecter pour accéder à cette fonctionnalité.")).toBeVisible()
  })

  test("l'acheteur ne peut pas accéder aux pages producteur", async ({ page }) => {
    await login(page, "buyer")
    await page.goto("/compte/producteur/annonces")
    await expect(page).toHaveURL("/")
  })
})
