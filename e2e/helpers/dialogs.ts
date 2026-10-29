import { expect, Page } from "@playwright/test"

// L'application utilise des dialogues natifs (window.alert / window.confirm) pour les
// confirmations et messages de succès : on les accepte automatiquement et on collecte
// leurs textes pour les assert.

export function acceptDialogs(page: Page): string[] {
  const messages: string[] = []
  page.on("dialog", (dialog) => {
    messages.push(dialog.message())
    dialog.accept().catch(() => undefined)
  })
  return messages
}

export function expectAlertOnce(messages: string[], text: string) {
  expectAlertTimes(messages, text, 1)
}

export function expectAlertTimes(messages: string[], text: string, times: number) {
  expect.poll(() => messages.filter((message) => message.includes(text)).length >= times).toBe(true)
}
