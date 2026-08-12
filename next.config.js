module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

    return config
  },
  turbopack: {
    // équivalent svgr pour Turbopack (bundler par défaut depuis Next 16)
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  compiler: {
    // css prop emotion, remplace le plugin Babel @emotion (Next 16 supprime le custom babel)
    emotion: true,
  },
  reactStrictMode: true,
  // BUILD_CPUS limite les workers de génération statique (RAM limitée sur Coolify) ; sans effet ailleurs
  ...(process.env.BUILD_CPUS ? { cpus: Number(process.env.BUILD_CPUS) } : {}),
}
