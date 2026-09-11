// horodatage commun à tous les logs du watcher (process qui tourne en continu : sans heure, impossible
// de recouper un log avec le moment où il s'est produit)
const stamp = () => new Date().toTimeString().slice(0, 8)

export const log = (...args: unknown[]) => console.log(`[${stamp()}]`, ...args)
export const logErr = (...args: unknown[]) => console.error(`[${stamp()}]`, ...args)
