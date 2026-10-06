// Constantes et comptes de test. Les identifiants transitent uniquement par les variables
// d'environnement (e2e/.env localement, secrets GitHub en CI) : jamais en clair dans le dépôt.

export const TEST_PRODUCT_TITLE = "[Test E2E] Panier de légumes de saison"
export const TEST_PRODUCT_DESCRIPTION = "Panier de légumes de saison récolté du jour, réservable en ligne [test E2E]"
export const TEST_PRODUCT_PRICE = "25"

export type Role = "buyer" | "producer"

const buyer = { email: process.env.TEST_BUYER_EMAIL || "", password: process.env.TEST_BUYER_PASSWORD || "" }
const producer = { email: process.env.TEST_PRODUCER_EMAIL || "", password: process.env.TEST_PRODUCER_PASSWORD || "" }

export const ACCOUNTS: Record<Role, { email: string; password: string }> = { buyer, producer }

export function hasAccounts(): boolean {
  return Object.keys(ACCOUNTS).every((role) => {
    const account = ACCOUNTS[role as Role]
    return account.email !== "" && account.password !== ""
  })
}
