// horodatage commun à tous les logs du watcher (process qui tourne en continu : sans heure, impossible
// de recouper un log avec le moment où il s'est produit)
// sv-SE = format ISO local « 2026-10-01 16:26:20 »
const stamp = () => new Date().toLocaleString("sv-SE")

export const log = (...args: unknown[]) => console.log(`[${stamp()}]`, ...args)
export const logErr = (...args: unknown[]) => console.error(`[${stamp()}]`, ...args)
