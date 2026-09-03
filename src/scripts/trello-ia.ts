// Watcher Trello + IA : voir README « Automatisation Trello + IA » et src/scripts/trello-ia/
import { Effect } from "effect"
import { AppLayer, main } from "./trello-ia/main"

// pas de process.exit(0) : ce script est un watcher qui ne se termine jamais
Effect.runPromise(main.pipe(Effect.provide(AppLayer))).catch((error) => {
  console.error(error)
  process.exit(1)
})
