module.exports = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

    return config
  },
  compiler: {
    // css prop emotion, remplace le plugin Babel @emotion (Next 16 supprime le custom babel)
    emotion: true,
  },
  reactStrictMode: true,
  // BUILD_CPUS limite les workers de génération statique (RAM limitée sur Coolify) ; sans effet ailleurs
  ...(process.env.BUILD_CPUS ? { experimental: { cpus: Number(process.env.BUILD_CPUS) } } : {}),
}
