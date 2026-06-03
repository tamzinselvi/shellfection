"use strict"

const path = require("path")

module.exports = function requireBuiltLib(moduleName) {
  const libPath = path.join(__dirname, "..", "lib", `${moduleName}.js`)

  try {
    return require(libPath)
  }
  catch (err) {
    if (err.code === "MODULE_NOT_FOUND" && err.message.indexOf(libPath) !== -1) {
      console.error(`shellfection: compiled ${path.relative(process.cwd(), libPath)} is missing. Run \`npm run build\` before using linked bins.`)
      process.exit(1)
    }

    throw err
  }
}
