# The image Kedalia deploys (`docker-compose.yaml`), one per branch; Vercel builds without it. Node 22 like the CI.
# corepack hands over to the yarn of `packageManager`, which runs the repository's own (yarnPath).
FROM node:22-alpine
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
RUN yarn build
# ponytail: one stage with the dev dependencies (2.4 GB, the install layer shared by every branch while yarn.lock
# stays the same); `output: "standalone"` would shrink it, but Vercel reads next.config.js too
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["yarn", "serve"]
