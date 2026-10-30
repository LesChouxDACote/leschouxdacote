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
    // le premier lien d'une carte peut être son badge « Bio / raisonnée » : on prend celui qui porte le titre
    const firstCard = page.locator("a[href^='/annonce/']").filter({ has: page.getByRole("heading") }).first()
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

  test("le lien « Notre charte » du pied de page ouvre la charte du site", async ({ page }) => {
    await page.goto("/")
    // le bandeau cookies recouvre le pied de page tant qu'aucun choix n'est fait
    await page.getByRole("button", { name: "Refuser" }).click()
    await page.getByRole("link", { name: "Notre charte" }).click()
    await expect(page).toHaveURL(/\/charte$/)
    await expect(
      page.getByRole("heading", { name: "Charte de respect de la vie privée – leschouxdacote.fr" }),
    ).toBeVisible()
    await expect(page.getByRole("cell", { name: "Vercel", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "contact@leschouxdacote.fr" }).first()).toHaveAttribute(
      "href",
      "mailto:contact@leschouxdacote.fr",
    )
  })

  test("le lien « Assistance » du pied de page ouvre l'aide du site, dont la recherche filtre les sujets", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Refuser" }).click()
    await page.getByRole("link", { name: "Assistance" }).click()
    await expect(page).toHaveURL(/\/aide$/)
    await expect(page.getByRole("heading", { name: "Aide en ligne" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Publier une annonce" })).toBeVisible()

    // sans accent : « creneau » trouve « Créer des créneaux de retrait »
    await page.getByRole("searchbox", { name: "Rechercher un sujet" }).fill("creneau")
    await expect(page.getByRole("link", { name: "Créer des créneaux de retrait" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Gérer ses favoris et ses alertes" })).toHaveCount(0)

    await page.getByRole("link", { name: "Créer des créneaux de retrait" }).click()
    await expect(page).toHaveURL(/\/aide\/creneaux$/)
    await page.getByRole("link", { name: "← Retour à l'aide" }).click()
    await expect(page).toHaveURL(/\/aide$/)
  })

  test("la FAQ de l'aide renvoie aux CGU pour la publication", async ({ page }) => {
    await page.goto("/aide/faq")
    await expect(page.getByText("La consultation est gratuite.")).toBeVisible()
    await expect(page.getByRole("link", { name: "CGU", exact: true }).first()).toHaveAttribute("href", "/cgu")
    await expect(page.getByText(/3 (premiers )?mois/)).toHaveCount(0)
  })

  test("l'inscription propose un lien « Besoin d'aide ? » vers sa page d'aide", async ({ page }) => {
    await page.goto("/inscription")
    await expect(page.getByRole("link", { name: "Besoin d'aide ?" })).toHaveAttribute("href", "/aide/creer-son-compte")
  })

  test("le bandeau cookies retient le refus et revient via « Modifier mon choix »", async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("region", { name: "Cookies" })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole("button", { name: "Accepter" })).toBeVisible()
    await banner.getByRole("button", { name: "Refuser" }).click()
    await expect(banner).toBeHidden()
    expect((await page.context().cookies()).filter((cookie) => cookie.name.startsWith("_ga"))).toHaveLength(0)

    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(banner).toBeHidden()

    await page.goto("/charte")
    await page.getByRole("button", { name: "Modifier mon choix" }).click()
    await expect(banner).toBeVisible()
  })

  test("une annonce inexistante répond 404 « Page introuvable »", async ({ page }) => {
    const response = await page.goto("/annonce/test-e2e-inexistant")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Page introuvable")).toBeVisible()
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
