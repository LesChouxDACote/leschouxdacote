import { expect, test } from "@playwright/test"

// Parcours de consultation (anonyme) : accueil, recherche, fiche annonce, fiche producteur.
// La recherche passe par l'URL (paramètre ll) pour ne pas dépendre de Google Places.

const SEARCH_URL = "/recherche?ll=43.6047,1.4442"

test.describe("Consultation", () => {
  test("l'accueil affiche le titre, la barre de recherche et le filtre bio", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: "Vente directe : Le circuit plus court des produits alimentaires" }),
    ).toBeVisible()
    await expect(page.getByPlaceholder("Que recherchez-vous ?")).toBeVisible()
    await expect(page.getByPlaceholder("Où ?")).toBeVisible()
    // Apostrophe droite dans ce libellé.
    await expect(page.getByText("Uniquement des produits Bio ou issus de l'Agriculture raisonnée")).toBeVisible()
  })

  test("la recherche de mots-clés propose des suggestions", async ({ page }) => {
    await page.goto("/")
    const what = page.getByPlaceholder("Que recherchez-vous ?")
    await what.click()
    await what.fill("légume")
    // Suggestions de tags (mêmes classes CSS que Google Places).
    const suggestion = page.locator(".pac-container .pac-item").first()
    await suggestion.waitFor({ timeout: 10000 })
    const tag = await suggestion.innerText()
    await suggestion.click()
    await expect(what).toHaveValue(tag.trim())
  })

  test("la page de recherche affiche les annonces autour d'un lieu", async ({ page }) => {
    await page.goto(SEARCH_URL)
    await expect(page.getByRole("heading", { name: "Les producteurs près de chez vous" })).toBeVisible()
  })

  test("le filtre bio n'affiche que des annonces bio", async ({ page }) => {
    await page.goto(`${SEARCH_URL}&bio=1`)
    await expect(page.getByRole("heading", { name: "Les producteurs près de chez vous" })).toBeVisible()
    // S'il y a des résultats, tous doivent porter le tag « Bio / raisonnée ».
    const cards = page.locator("a[href^='/annonce/']")
    const count = await cards.count()
    for (let index = 0; index < Math.min(count, 10); index += 1) {
      const card = cards.nth(index).locator("xpath=ancestor::div[3]")
      await expect(card.getByText("Bio / raisonnée").first()).toBeVisible()
    }
  })

  test("la fiche annonce affiche titre, description et producteur", async ({ page }) => {
    await page.goto(SEARCH_URL)
    const firstCard = page.locator("a[href^='/annonce/']").first()
    await firstCard.waitFor({ timeout: 10000 })
    const title = await firstCard.getByRole("heading").innerText()
    await firstCard.click()
    await expect(page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible()
  })

  test("la fiche producteur affiche ses annonces en ligne", async ({ page }) => {
    await page.goto(SEARCH_URL)
    const firstCard = page.locator("a[href^='/annonce/']").first()
    await firstCard.waitFor({ timeout: 10000 })
    await firstCard.click()
    const producerLink = page.locator("a[href^='/producteur/']").first()
    await producerLink.waitFor({ timeout: 10000 })
    const producerName = await producerLink.innerText()
    await producerLink.click()
    // Le h1 de la fiche producteur contient aussi l'adresse : correspondance partielle.
    await expect(page.getByRole("heading", { name: producerName }).first()).toBeVisible()
    await expect(page.getByText(/annonces en ligne/).first()).toBeVisible()
  })

  test("une annonce inexistante affiche « Produit introuvable »", async ({ page }) => {
    await page.goto("/annonce/test-e2e-inexistant")
    await expect(page.getByText("Produit introuvable")).toBeVisible()
  })

  test("en mobile, la recherche bascule entre liste et carte", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto(SEARCH_URL)
    await expect(page.getByRole("button", { name: "Carte" })).toBeVisible()
    await page.getByRole("button", { name: "Carte" }).click()
    await expect(page.locator(".mapboxgl-canvas").first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole("button", { name: "Liste" })).toBeVisible()
  })
})
