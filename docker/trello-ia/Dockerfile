# Watcher Trello + IA (yarn watch-trello) — voir README « Automatisation Trello + IA »
FROM node:20-slim

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
RUN yarn install --immutable

COPY . .

# /data (volume) : credentials + sessions Claude, état des tickets, worktrees
ENV CLAUDE_CONFIG_DIR=/data/claude \
    IA_STATE_FILE=/data/ia-sessions.json \
    IA_WORKTREES_DIR=/data/worktrees

RUN chmod +x docker/trello-ia/entrypoint.sh

ENTRYPOINT ["docker/trello-ia/entrypoint.sh"]
CMD ["yarn", "watch-trello"]
