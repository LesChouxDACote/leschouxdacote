#!/bin/sh
set -e

mkdir -p /data/worktrees "$CLAUDE_CONFIG_DIR"

# identité git pour les commits de l'orchestrateur
git config --global user.name "${GIT_AUTHOR_NAME:-Automatisation IA}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-ia@leschouxdacote.fr}"
git config --global --add safe.directory "*"

# gh sert de credential helper git : fetch/push via GH_TOKEN
if [ -z "$GH_TOKEN" ]; then
  echo "ERREUR : GH_TOKEN manquant (token GitHub avec droits repo)" >&2
  exit 1
fi
gh auth setup-git

# Coolify construit l'image sans le dossier .git : on recrée un dépôt relié à origin
if [ ! -d .git ]; then
  git init --initial-branch production --quiet
  git remote add origin "https://github.com/${GITHUB_REPO:?GITHUB_REPO manquant (ex. RaphaelPI/leschouxdacote)}.git"
fi
git fetch origin production

if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ] && [ ! -f "$CLAUDE_CONFIG_DIR/.credentials.json" ]; then
  echo "ATTENTION : aucune authentification Claude détectée." >&2
  echo "Définis CLAUDE_CODE_OAUTH_TOKEN (généré avec « claude setup-token » sur ta machine)" >&2
  echo "ou ANTHROPIC_API_KEY, ou lance « claude /login » depuis le terminal du conteneur." >&2
fi

exec "$@"
