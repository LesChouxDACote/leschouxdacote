import { expect, test } from "@playwright/test"

import { ACCOUNTS, hasAccounts, TEST_PRODUCT_TITLE } from "../helpers/config"
import { login, openUserMenu } from "../helpers/auth"
import { deleteTestProduct, findTestProductId, gotoMyProducts } from "../helpers/produit"

// Parcours de réservation : garde d'accès, réservation acheteur, erreurs de validation,
// modification/annulation côté acheteur, vue producteur. Sérialisé : dépend de l'annonce
// créée par le projet « publication » (id retrouvé ici via « Mes annonces ») et la supprime
// en fin de parcours.

let productId: string | null = null

test.describe.serial("Réservations", () => {
  test.beforeEach(() => {
    test.skip(!hasAccounts(), "Comptes de test absents (TEST_BUYER_*/TEST_PRODUCER_* non renseignés)")
  })

  test("l'annonce de test est en ligne et réservable", async ({ page }) => {
    await login(page, "producer")
    await gotoMyProducts(page)
    productId = await findTestProductId(page)
    await page.goto(`/annonce/${productId}`)
    // La section de réservation n'apparaît qu'après hydratation (créneaux à venir).
    await expect(page.getByRole("button", { name: "Réserver" })).toBeVisible({ timeout: 20000 })
  })

  test("un anonyme qui réserve est redirigé vers la connexion", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await page.goto(`/annonce/${productId}`)
    await page.getByRole("button", { name: "Réserver" }).click()
    await expect(page).toHaveURL(new RegExp(`/connexion\\?next=.*/annonce/${productId}`))
  })

  test("l'acheteur réserve un créneau", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "buyer")
    await page.goto(`/annonce/${productId}`)
    await page.getByRole("button", { name: "Réserver" }).click()
    await expect(page.getByRole("heading", { name: "Réservation" })).toBeVisible()
    await page.getByRole("button", { name: /de 10:00 à 12:00/ }).click()
    await page.getByLabel("Quantité").fill("2")
    await page.getByLabel("Téléphone").fill("0612345678")
    await expect(page.getByLabel("E-mail")).toHaveValue(ACCOUNTS.buyer.email)
    await page.getByRole("button", { name: "Valider la réservation" }).click()
    await expect(page.getByText("Votre réservation a bien été validée.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Modifier ma réservation" })).toBeVisible()
  })

  test("les erreurs de validation de la réservation s'affichent", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "buyer")
    await page.goto(`/annonce/${productId}`)
    await page.getByRole("button", { name: "Modifier ma réservation" }).click()
    await expect(page.getByRole("heading", { name: "Réservation" })).toBeVisible()
    await page.getByLabel("Quantité").fill("0")
    await page.getByLabel("Téléphone").fill("abc")
    await page.getByRole("button", { name: "Valider la réservation" }).click()
    await expect(page.getByText("La quantité doit être supérieure à 0")).toBeVisible()
    await expect(page.getByText("Désolé, le numéro de téléphone est invalide")).toBeVisible()
    await page.locator('button[aria-label="Fermer"]').click()
    await expect(page.getByRole("heading", { name: "Réservation" })).toBeHidden()
  })

  test("l'acheteur modifie sa réservation depuis « Mes réservations »", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "buyer")
    await openUserMenu(page)
    await page.getByRole("link", { name: "Mes réservations" }).click()
    await expect(page.getByRole("heading", { name: "Mes réservations" })).toBeVisible()
    const card = page.getByRole("link", { name: TEST_PRODUCT_TITLE }).locator("xpath=ancestor::section[1]")
    await card.waitFor({ timeout: 20000 })
    // 2 réservés, 2 au plus par personne (addSlotReservation) : on descend à 1
    await card.locator('input[aria-label="Quantité"]').fill("1")
    await card.getByRole("button", { name: "Modifier" }).click()
    await expect(card.getByText("Votre réservation a bien été modifiée.")).toBeVisible()
  })

  test("le producteur voit la réservation dans la gestion de son annonce", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    await expect(page.getByRole("heading", { name: "Mes réservations" })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText("Total réservé : 1 / 10")).toBeVisible()
    await expect(page.getByText("Prénom Nom")).toBeVisible()
  })

  test("l'acheteur annule sa réservation", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "buyer")
    await page.goto("/compte/reservations")
    const card = page.getByRole("link", { name: TEST_PRODUCT_TITLE }).locator("xpath=ancestor::section[1]")
    await card.waitFor({ timeout: 20000 })
    await card.getByRole("button", { name: "Annuler" }).click()
    // Apostrophes typographiques dans la modale (’).
    await page.getByText("Confirmez-vous l’annulation de cette réservation ?").waitFor()
    await page.getByRole("button", { name: "Confirmer l’annulation" }).click()
    await expect(page.getByRole("link", { name: TEST_PRODUCT_TITLE })).toHaveCount(0)
  })

  test("suppression de l'annonce de test", async ({ page }) => {
    test.skip(!productId, "Annonce de test non trouvée")
    await login(page, "producer")
    await deleteTestProduct(page)
  })
})
