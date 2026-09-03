# Watcher Trello + IA (yarn watch-trello) — voir README « Automatisation Trello + IA »
FROM node:22-slim

# git (worktrees), gh (pull requests), claude (plan + implémentation)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @anthropic-ai/claude-code \
  && corepack enable

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases

# petits serveurs : timeouts réseau larges + téléchargements moins parallèles (vaut aussi
# pour le « yarn install » exécuté à chaud dans les worktrees)
ENV YARN_HTTP_TIMEOUT=300000 \
    YARN_NETWORK_CONCURRENCY=8

# cache yarn hors des layers, réutilisé d'un build à l'autre (BuildKit requis :
# en local, construire avec DOCKER_BUILDKIT=1)
RUN --mount=type=cache,target=/root/.yarn/berry/cache yarn install --immutable

COPY . .

# /data (volume) : credentials + sessions Claude, état des tickets, worktrees
ENV CLAUDE_CONFIG_DIR=/data/claude \
    IA_STATE_FILE=/data/ia-sessions.json \
    IA_WORKTREES_DIR=/data/worktrees

RUN chmod +x docker/trello-ia/entrypoint.sh

ENTRYPOINT ["docker/trello-ia/entrypoint.sh"]
CMD ["yarn", "watch-trello"]
