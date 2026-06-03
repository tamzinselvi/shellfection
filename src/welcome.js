import path from "path"
import { spawnSync } from "child_process"

const welcomeScript = path.join(__dirname, "..", "bin", "shellfection-welcome.py")
const pythonCommands = ["python", "python2"]

const runWelcome = () => {
  for (const command of pythonCommands) {
    const result = spawnSync(command, [welcomeScript], { stdio: "inherit" })

    if (result.error && result.error.code === "ENOENT") {
      continue
    }

    if (result.error) {
      console.error(`shellfection-welcome: failed to run ${command}: ${result.error.message}`)
      process.exit(1)
    }

    process.exit(result.status === null ? 1 : result.status)
  }

  console.error("shellfection-welcome: Python 2 is required for the legacy welcome screen. Install python or python2, then run shellfection-welcome again.")
  process.exit(1)
}

runWelcome()
