import { Data } from "effect"

// Le texte de `message` est posté tel quel sur la carte Trello (⚠️) : il doit rester lisible.
export class EnvError extends Data.TaggedError("EnvError")<{ readonly message: string }> {}
export class TrelloError extends Data.TaggedError("TrelloError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
export class StateError extends Data.TaggedError("StateError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
export class ShellError extends Data.TaggedError("ShellError")<{ readonly message: string }> {}
export class ClaudeError extends Data.TaggedError("ClaudeError")<{ readonly message: string }> {}
// erreurs d'orchestration (liste absente, branche déjà existante, implémentation sans changement…)
export class WatcherError extends Data.TaggedError("WatcherError")<{ readonly message: string }> {}
