import Bugsnag from "@bugsnag/js"
import BugsnagReact from "@bugsnag/plugin-react"
import React from "react"

const apiKey = process.env.NEXT_PUBLIC_BUGSNAG

if (apiKey) {
  Bugsnag.start({
    apiKey,
    releaseStage: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    enabledReleaseStages: ["production", "preview"],
    appVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local",
    metadata: {
      deploy: {
        url: process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "local",
        date: new Date().toString(),
        author: `${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME} (${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN})`,
      },
    },
    plugins: [new BugsnagReact(React)],
  })
}

export const ErrorBoundary = apiKey ? Bugsnag.getPlugin("react")?.createErrorBoundary() : null
