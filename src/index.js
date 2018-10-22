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
  .description("installs symlinks and all missing pkgs, includes themer")
  .option("--clean", "installs symlinks regardless if they exist")
  .option("--deep-clean", "installs symlinks and local configuration regardless if they exist")
  .option("--skip-packages", "skip installing casks and packages")
  .action((options) => {
    commands.install(options, spinner)
      .then(() => console.log("complete".green))
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
