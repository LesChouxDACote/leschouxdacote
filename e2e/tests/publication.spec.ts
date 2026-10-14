import { expect, test } from "@playwright/test"

import { TEST_PRODUCT_TITLE } from "../helpers/config"
import { login } from "../helpers/auth"
import { acceptDialogs, expectAlertOnce } from "../helpers/dialogs"
import {
  addSlot,
  addSlotReservation,
  deleteTestProduct,
  fillProductForm,
  findTestProductId,
  getSlotCard,
  getTestProductCard,
  gotoMyProducts,
  openProductForm,
  SLOT_1,
  SLOT_2,
  SLOT_EARLY,
  slotHours,
  submitProductForm,
} from "../helpers/produit"

// Parcours de publication (producteur) : création d'annonce avec créneau et réservation,
// modification, créneaux, garde de sortie, désactivation/réactivation. Les tests sont
// sérialisés : l'annonce de test créée ici est utilisée puis supprimée par « reservations ».

let productId: string | null = null

test.describe.serial("Publication d'annonce", () => {
  test.beforeEach(() => {
    test.skip(!process.env.TEST_PRODUCER_EMAIL, "Compte producteur de test absent")
  })

  test("nettoyage d'une éventuelle annonce de test précédente", async ({ page }) => {
    await login(page, "producer")
    await gotoMyProducts(page)
    // Auto-réparation : si une exécution précédente a échoué avant la suppression, l'annonce
    // de test est encore là — on la supprime pour repartir d'un état propre.
    const existing = getTestProductCard(page)
    await existing.waitFor({ timeout: 10000 }).catch(() => undefined)
    if ((await existing.count()) > 0) {
      await deleteTestProduct(page)
    }
  })

  test("création d'une annonce avec créneau et réservation", async ({ page }) => {
    const messages = acceptDialogs(page)
    await login(page, "producer")
    await openProductForm(page)
    await fillProductForm(page)
    await addSlot(page, SLOT_1)
    await addSlotReservation(page, SLOT_1, {
      totalQuantity: "10",
      maxQuantityPerPerson: "2",
      instructions: "Merci de venir avec un sac de récupération.",
    })
    await submitProductForm(page)
    expectAlertOnce(messages, "Votre annonce a bien été créée")
    await gotoMyProducts(page)
    const card = getTestProductCard(page)
    await card.waitFor()
    await expect(card.getByText("Annonce en ligne")).toBeVisible()
    await expect(card.getByText(`de ${SLOT_1.start} à ${SLOT_1.end}`).first()).toBeVisible()
    productId = await findTestProductId(page)
  })

  test("l'annonce créée est visible publiquement", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    await page.goto(`/annonce/${productId}`)
    await expect(page.getByRole("heading", { name: TEST_PRODUCT_TITLE, exact: true })).toBeVisible()
    await expect(page.getByText("Créneaux", { exact: true })).toBeVisible()
    await expect(page.getByText(`de ${SLOT_1.start} à ${SLOT_1.end}`).first()).toBeVisible()
    // La section de réservation n'apparaît qu'après hydratation (créneaux à venir).
    await expect(page.getByRole("button", { name: "Réserver" })).toBeVisible({ timeout: 20000 })
  })

  test("modification de l'annonce", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    const messages = acceptDialogs(page)
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    await expect(page.locator('input[name="title"]')).toHaveValue(TEST_PRODUCT_TITLE)
    await page.locator('input[name="price"]').fill("26")
    await submitProductForm(page)
    expectAlertOnce(messages, "Votre annonce a bien été modifiée")
    await expect(page).toHaveURL(/\/compte\/producteur\/annonces/)
  })

  test("ajout puis suppression d'un créneau", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    const messages = acceptDialogs(page)
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    await addSlot(page, SLOT_2)
    await getSlotCard(page, SLOT_2).getByRole("button", { name: "Supprimer le créneau" }).click()
    await page.getByText(/Supprimer le créneau du/).waitFor()
    // Créneau sans client : pas d'avertissement
    await expect(page.getByText(/déjà réservé ce créneau/)).toHaveCount(0)
    await page.getByRole("button", { name: "Supprimer", exact: true }).click()
    await expect(getSlotCard(page, SLOT_2)).toHaveCount(0)
    // On enregistre pour ne pas déclencher la garde de sortie au test suivant.
    await submitProductForm(page)
    expectAlertOnce(messages, "Votre annonce a bien été modifiée")
  })

  test("les créneaux se rangent par date et un créneau incohérent est refusé", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    await addSlot(page, SLOT_EARLY)
    // Ajouté après SLOT_1, SLOT_EARLY (plus proche) s'affiche avant lui
    const cards = page
      .locator("main .MuiPaper-root")
      .filter({ has: page.getByRole("button", { name: "Supprimer le créneau" }) })
    await expect(cards.first()).toContainText(slotHours(SLOT_EARLY))
    await expect(cards.nth(1)).toContainText(slotHours(SLOT_1))
    // Doublon et heure de fin avant l'heure de début : l'erreur s'affiche dans l'encadré, qui reste ouvert
    await page.getByRole("button", { name: "Ajouter un créneau" }).click()
    await page.getByLabel("Date *").fill(SLOT_1.date)
    await page.getByLabel("Heure début *").fill(SLOT_1.start)
    await page.getByLabel("Heure fin *").fill(SLOT_1.end)
    await page.getByRole("button", { name: "Ajouter", exact: true }).click()
    await expect(page.getByText("Ce créneau existe déjà.")).toBeVisible()
    await page.getByLabel("Heure fin *").fill("09:00")
    await page.getByRole("button", { name: "Ajouter", exact: true }).click()
    await expect(page.getByText("L'heure de début doit être avant l'heure de fin.")).toBeVisible()
    await expect(page.getByLabel("Date *")).toBeVisible()
  })

  test("un stock à 0 est signalé dans la carte et bloque l'enregistrement", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    const messages = acceptDialogs(page)
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    const card = getSlotCard(page, SLOT_1)
    await card.getByRole("button", { name: "Modifier le créneau" }).click()
    await card.getByLabel("Stock disponible *").fill("0")
    await expect(card.getByText("Indiquez un stock supérieur à 0.")).toBeVisible()
    await expect(card.getByText("Réglages à corriger")).toBeVisible()
    await submitProductForm(page)
    await expect(page.getByText(/Un créneau contient une réservation incomplète/)).toBeVisible()
    expect(messages).toHaveLength(0)
    // Stock corrigé : l'annonce s'enregistre et garde le stock d'origine
    await card.getByLabel("Stock disponible *").fill("10")
    await expect(card.getByText("Réservation ouverte · 0 / 10 réservés")).toBeVisible()
    await submitProductForm(page)
    expectAlertOnce(messages, "Votre annonce a bien été modifiée")
  })

  test("la garde empêche de quitter avec des modifications non enregistrées", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    await login(page, "producer")
    await page.goto(`/compte/producteur/annonce/${productId}`)
    await page.locator('input[name="price"]').fill("27")
    await expect(page.getByText("Modifications non enregistrées")).toBeVisible()
    // Navigation par le logo du header : la modale de garde doit s'afficher.
    await page.locator("header a[href='/']").first().click()
    await expect(page.getByRole("heading", { name: "Modifications non enregistrées" })).toBeVisible()
    await page.getByRole("button", { name: "Quitter sans enregistrer" }).click()
    await expect(page).toHaveURL("/")
  })

  test("désactivation puis réactivation de l'annonce", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    await login(page, "producer")
    await gotoMyProducts(page)
    const card = getTestProductCard(page)
    await card.waitFor()
    // Apostrophe typographique dans l'UI (’ et non ').
    await card.getByRole("button", { name: "Désactiver l’annonce" }).click()
    await page.getByText("Désactiver l’annonce ?", { exact: true }).waitFor()
    await page.getByRole("button", { name: "Valider" }).first().click()
    await expect(card.getByText("Annonce désactivée")).toBeVisible({ timeout: 20000 })
    await card.getByRole("button", { name: "Publier l’annonce" }).click()
    await page.getByText(/jour\(s\) supplémentaires/).waitFor()
    await page.locator('input[name="days"]').fill("10")
    await page.getByRole("button", { name: "Valider" }).first().click()
    await expect(card.getByText("Annonce en ligne")).toBeVisible({ timeout: 20000 })
  })

  test("ajout de jours de publication", async ({ page }) => {
    test.skip(!productId, "Annonce de test non créée")
    await login(page, "producer")
    await gotoMyProducts(page)
    const card = getTestProductCard(page)
    await card.waitFor()
    await card.getByRole("button", { name: "Ajouter des jours" }).click()
    await page.getByText(/jour\(s\) supplémentaires/).waitFor()
    await page.locator('input[name="days"]').fill("5")
    await page.getByRole("button", { name: "Valider" }).first().click()
    await expect(card.getByText(/La publication se termine le/)).toBeVisible({ timeout: 20000 })
  })
})
