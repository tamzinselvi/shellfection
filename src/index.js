import pkg from "../package.json"

import program from "commander"
import { Spinner } from "cli-spinner"

import * as commands from "./commands"

const spinner = new Spinner()

program
  .version(pkg.version)

console.log(`${"shellfection".rainbow}`)

program
  .command("gist-download")
  .description("downloads configuration and specified files from gist")
  .action(() => {
    commands.gistDownload(spinner)
      .then(() => {
        console.log("complete".green)
        process.exit(0)
      })
  })

program
  .command("gist-upload")
  .description("uploads current configuration and specified files to saved gist")
  .action(() => {
    commands.gistUpload(spinner)
      .then(() => {
        console.log("complete".green)
        process.exit(0)
      })
  })

program
  .command("sync")
  .description("synchronizes configuration with locally installed pacakages and casks")
  .action(() => {
    commands.sync(spinner)
      .then(() => {
        console.log("complete".green)
        process.exit(0)
      })
  })

program
  .command("install")
  .description("installs packages, dotfile symlinks, local config, themer, npm, and pip")
  .option("--clean", "replace existing managed symlinks; keep existing cloned local config")
  .option("--deep-clean", "replace existing managed symlinks and cloned local config")
  .option("--skip-packages", "skip OS package managers only; still run symlinks, local config, themer, npm, and pip")
  .action((options) => {
    commands.install(options, spinner)
      .then(() => console.log("complete".green))
      .catch(() => process.exit(1))
  })

program
  .command("pip")
  .description("installs pip packages")
  .action((options) => {
    commands.installPip(options, spinner)
      .then(() => console.log("complete".green))
  })

program
  .command("npm")
  .description("installs npm packages")
  .action((options) => {
    commands.installNpm(options, spinner)
      .then(() => console.log("complete".green))
  })

program
  .command("themer")
  .description("builds themer, symlinks and converts labeled directories svgs to pngs")
  .action((options) => {
    commands.installThemer(options, spinner)
      .then(() => console.log("complete".green))
  })

program.parse(process.argv)

if (program.args.length === 0) {
  program.help()
}
