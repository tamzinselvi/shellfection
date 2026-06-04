import js from "@eslint/js"

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        __dirname: "readonly",
        console: "readonly",
        process: "readonly",
        require: "readonly",
        Symbol: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "never"],
    },
  },
]
