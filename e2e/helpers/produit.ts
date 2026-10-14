import { expect, Page } from "@playwright/test"

import { TEST_PRODUCT_DESCRIPTION, TEST_PRODUCT_PRICE, TEST_PRODUCT_TITLE } from "./config"

export interface TestSlot {
  date: string
  start: string
  end: string
}

export interface TestReservation {
  totalQuantity: string
  maxQuantityPerPerson: string
  instructions: string
}

// Dates relatives : les créneaux doivent être à venir pour être réservables.
function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const SLOT_1: TestSlot = { date: addDays(2), start: "10:00", end: "12:00" }
export const SLOT_2: TestSlot = { date: addDays(3), start: "14:00", end: "16:00" }
// Plus proche que SLOT_1 : ajouté après lui, il doit pourtant s'afficher en premier.
export const SLOT_EARLY: TestSlot = { date: addDays(1), start: "08:00", end: "09:00" }

export const TEST_ADDRESS = "1 Place du Capitole, 31000 Toulouse"

export function openProductForm(page: Page) {
  return page.goto("/compte/producteur/annonce")
}

export async function gotoMyProducts(page: Page) {
  await page.goto("/compte/producteur/annonces")
}

// Champ « Adresse de la vente » : Google Places (réseau externe). On saisit l'adresse puis on
// clique la première suggestion de la liste déroulante.
export async function fillAddress(page: Page, address: string) {
  await page.locator("#place").fill(address)
  const suggestion = page.locator(".pac-container:visible .pac-item").first()
  await suggestion.waitFor({ timeout: 20000 })
  await suggestion.click()
}

// Mots-clés : suggestions Algolia (boutons dans la div qui suit l'input #_tags).
export async function addTag(page: Page, search: string) {
  await page.locator("#_tags").fill(search)
  const suggestion = page.locator("#_tags").locator("xpath=following-sibling::div[1]").getByRole("button").first()
  await suggestion.waitFor({ timeout: 10000 })
  await suggestion.click()
  // Le mot-clé sélectionné rejoint le champ caché que le formulaire envoie (sa « chip » lit « légume× » : bouton compris).
  await expect(page.locator('input[type="hidden"][name="_tags"]')).toHaveValue(new RegExp(`(^|,)${search}(,|$)`))
}

export async function fillProductForm(page: Page) {
  await page.locator('input[name="title"]').fill(TEST_PRODUCT_TITLE)
  await page.locator('input[name="quantity"]').fill("10")
  await page.locator('select[name="unit"]').selectOption("kg")
  await page.locator('input[name="price"]').fill(TEST_PRODUCT_PRICE)
  await fillAddress(page, TEST_ADDRESS)
  await page.locator('textarea[name="description"]').fill(TEST_PRODUCT_DESCRIPTION)
  await addTag(page, "légume")
  // Switch « Bio ou agriculture raisonnée » (décoché par défaut à la création)
  await page.getByText("Bio ou agriculture raisonnée").click()
  await page.locator('input[name="photo"]').setInputFiles(`${__dirname}/../fixtures/photo.jpg`)
  await page.locator('input[name="days"]').fill("10")
}

// Libellé des heures d'une carte de créneau (« samedi 12 octobre, 10h–12h »).
export function slotHours(slot: TestSlot) {
  return `${slot.start.replace(":", "h")}–${slot.end.replace(":", "h")}`
}

// Carte d'un créneau : le Paper MUI qui contient son libellé d'heures.
export function getSlotCard(page: Page, slot: TestSlot) {
  return page
    .locator("main .MuiPaper-root")
    .filter({ has: page.getByText(slotHours(slot)) })
    .filter({ has: page.getByRole("button", { name: "Supprimer le créneau" }) })
}

// Encadré « Nouveau créneau », ouvert par « Ajouter un créneau » : il se referme et se vide après l'ajout.
export async function addSlot(page: Page, slot: TestSlot) {
  await page.getByRole("button", { name: "Ajouter un créneau" }).click()
  await page.getByLabel("Date *").fill(slot.date)
  await page.getByLabel("Heure début *").fill(slot.start)
  await page.getByLabel("Heure fin *").fill(slot.end)
  await page.getByRole("button", { name: "Ajouter", exact: true }).click()
  await expect(getSlotCard(page, slot)).toBeVisible()
  await expect(page.getByLabel("Date *")).toHaveCount(0)
}

// Réglages de réservation du créneau tout juste ajouté (sa carte s'ouvre d'elle-même) : pris en
// compte dès la saisie, sans validation séparée.
export async function addSlotReservation(page: Page, slot: TestSlot, reservation: TestReservation) {
  const card = getSlotCard(page, slot)
  await card.getByRole("button", { name: "Ouvrir la réservation" }).click()
  await card.getByLabel("Stock disponible *").fill(reservation.totalQuantity)
  await card.getByLabel("Quantité maximale par personne").fill(reservation.maxQuantityPerPerson)
  await card.getByLabel("Informations et consignes pour les clients").fill(reservation.instructions)
  await expect(card.getByText(`Réservation ouverte · 0 / ${reservation.totalQuantity} réservés`)).toBeVisible()
}

// Envoi du formulaire d'annonce : le SubmitButton principal est le premier « Valider » du DOM.
export function submitProductForm(page: Page) {
  return page.getByRole("button", { name: "Valider" }).first().click()
}

// Carte de l'annonce de test sur « Mes annonces » : le h4 (titre) remonte de 3 div jusqu'au
// conteneur de la carte, qui porte les actions (édition, suppression, statut). Le sélecteur est
// borné à <main> pour exclure les modales (rendues dans un portail hors du main).
export function getTestProductCard(page: Page) {
  return page
    .locator("main")
    .getByRole("heading", { name: TEST_PRODUCT_TITLE, exact: true })
    .locator("xpath=ancestor::div[3]")
}

export async function findTestProductId(page: Page): Promise<string> {
  const href = await getTestProductCard(page)
    .locator("a[href*='/compte/producteur/annonce/']")
    .first()
    .getAttribute("href")
  if (!href) {
    throw new Error("Lien d'édition introuvable sur la carte de l'annonce de test")
  }
  return href.split("/").pop() as string
}

export async function deleteTestProduct(page: Page) {
  await gotoMyProducts(page)
  const card = getTestProductCard(page)
  await card.waitFor({ timeout: 20000 })
  // Le premier bouton de la carte est l'icône de suppression.
  await card.getByRole("button").first().click()
  await page.getByText("Supprimer l’annonce ?", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Valider" }).first().click()
  await expect(getTestProductCard(page)).toHaveCount(0)
}
