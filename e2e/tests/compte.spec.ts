import { expect, type Page, test } from "@playwright/test"

import { ACCOUNTS, hasAccounts } from "../helpers/config"
import { login, logout, openUserMenu } from "../helpers/auth"
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
      const tab = page.getByRole("tab", { name: new RegExp(name) })
      await tab.click()
      await expect(tab).toHaveAttribute("aria-selected", "true")
    }
    await expect(page.getByRole("link", { name: "Créer une annonce" }).first()).toBeVisible()
    await page.goto("/compte/profil")
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
  })
})

// Identifiant Firebase de l'utilisateur connecté, lu dans la persistance IndexedDB du SDK
const getCurrentUid = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb")
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const request = open.result.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll()
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const entry = request.result.find((item: { value?: { uid?: string } }) => item.value?.uid)
            return entry ? resolve(entry.value.uid) : reject(new Error("Utilisateur Firebase introuvable"))
          }
        }
      }),
  )

// L'acheteur de test suit le producteur de test, qui le retrouve dans la liste de ses abonnés ;
// l'abonnement est retiré en fin de parcours (données de dev réelles).
test.describe.serial("Abonnés du producteur", () => {
  let producerUid: string | null = null

  test.beforeEach(() => {
    test.skip(!hasAccounts(), "Comptes de test absents (TEST_BUYER_*/TEST_PRODUCER_* non renseignés)")
  })

  test("l'acheteur suit le producteur", async ({ page }) => {
    await login(page, "producer")
    producerUid = await getCurrentUid(page)
    await openUserMenu(page)
    await logout(page)
    await login(page, "buyer")
    await page.goto(`/producteur/${producerUid}`)
    const follow = page.getByRole("button", { name: "Suivre le producteur" })
    const unfollow = page.getByRole("button", { name: "Ne plus suivre le producteur" })
    await expect(follow.or(unfollow)).toBeVisible()
    if (await follow.isVisible()) {
      const saved = page.waitForResponse((response) => response.url().includes("/api/follow"))
      await follow.click()
      await saved
    }
    await expect(unfollow).toBeVisible()
  })

  test("le producteur voit l'acheteur dans la liste de ses abonnés", async ({ page }) => {
    test.skip(!producerUid, "Producteur de test non trouvé")
    await login(page, "producer")
    await page.goto("/compte/producteur/annonces")
    await page.getByRole("button", { name: /abonné/ }).click()
    const dialog = page.getByRole("dialog", { name: "Mes abonnés" })
    await expect(dialog.getByRole("link", { name: ACCOUNTS.buyer.email, exact: true })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Télécharger la liste" })).toBeVisible()
  })

  test("l'acheteur ne suit plus le producteur", async ({ page }) => {
    test.skip(!producerUid, "Producteur de test non trouvé")
    await login(page, "buyer")
    await page.goto(`/producteur/${producerUid}`)
    const saved = page.waitForResponse((response) => response.url().includes("/api/follow"))
    await page.getByRole("button", { name: "Ne plus suivre le producteur" }).click()
    await saved
    await expect(page.getByRole("button", { name: "Suivre le producteur" })).toBeVisible()
  })
})
