import nextPlugin from "@next/eslint-plugin-next"
import tsParser from "@typescript-eslint/parser"
import tseslint from "@typescript-eslint/eslint-plugin"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import prettier from "eslint-plugin-prettier"
import eslintConfigPrettier from "eslint-config-prettier"

export default [
  {
    ignores: ["node_modules/**", ".next/**", ".yarn/**", "public/**", "next-env.d.ts", "tsconfig.tsbuildinfo"],
  },
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react, prettier },
    rules: {
      ...react.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "prettier/prettier": "error",
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks, "@typescript-eslint": tseslint, prettier },
    rules: {
      ...react.configs.flat.recommended.rules,
      // règles d'origine (avant react-hooks v7) : on n'active pas les nouvelles règles
      // (set-state-in-effect, refs, impure-function...) qui exigeraient du refactoring
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...tseslint.configs["flat/recommended"].rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": ["error", { allowReferrer: true }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prettier/prettier": "error",
    },
    settings: { react: { version: "detect" } },
  },
  nextPlugin.configs["core-web-vitals"],
  {
    // règles next ignorées : photos Firebase Storage en <img> (pas d'optimiseur configuré)
    // et polices Google via <link> dans _app (pas de next/font)
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
  eslintConfigPrettier,
]
