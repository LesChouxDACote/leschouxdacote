# The image Kedalia deploys (`docker-compose.yaml`), one per branch; Vercel builds without it. Node 24 like the CI and Vercel.
# Two stages: the build has the dev dependencies (1.3 GB of node_modules), the image only what `next build` traced as
# needed at runtime (`output: "standalone"`, turned on by NEXT_OUTPUT: Vercel reads next.config.js too and has no such
# variable). One image per deployment stays on the server, so its size is disk.
# corepack hands over to the yarn of `packageManager`, which runs the repository's own (yarnPath).
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && chown node:node /app
USER node
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node .yarn ./.yarn
RUN yarn install --immutable && yarn cache clean --all
COPY --chown=node:node . .
# The build inlines the NEXT_PUBLIC_* into the client bundle and prerenders every product from Firestore, hence the
# server keys too. Build args, not ENV: they stay out of the running container's environment, which the compose sets.
ARG NEXT_PUBLIC_ALGOLIA_APP_ID NEXT_PUBLIC_ALGOLIA_API_KEY NEXT_PUBLIC_ALGOLIA_INDEX NEXT_PUBLIC_ALGOLIA_TAGS \
    NEXT_PUBLIC_BUGSNAG NEXT_PUBLIC_FIREBASE_ID NEXT_PUBLIC_FIREBASE_KEY NEXT_PUBLIC_FIREBASE_MEASURE \
    NEXT_PUBLIC_FIREBASE_MESSAGING NEXT_PUBLIC_FIREBASE_PROJECT NEXT_PUBLIC_MAPBOX_TOKEN NEXT_PUBLIC_URL \
    FIREBASE_EMAIL FIREBASE_PRIVATE_KEY BUILD_CPUS
ENV NEXT_OUTPUT=standalone
RUN yarn build

FROM node:24-alpine
WORKDIR /app
RUN chown node:node /app
USER node
# HOSTNAME: the standalone server listens on it, and Docker sets it to the container's id; the healthcheck asks 127.0.0.1
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
