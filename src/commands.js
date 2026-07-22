import "colors"
import fs from "fs"
import fse from "fs-extra"
import readline from "readline"
import * as _ from "lodash"
import path from "path"
import sharp from "sharp"
import userHome from "user-home"
const Gists = require("gists")
import { exec } from "child_process"

import * as util from "./util"

import defaultConfig from "../config.json"

const brewfilePath = path.join(__dirname, "../Brewfile")
const ohMyZshInstallUrl = "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh"
const vundleRepoUrl = "https://github.com/VundleVim/Vundle.vim.git"
const commandTimeoutMs = 5 * 60 * 1000
const warningOutputLines = 40

const shellQuote = (value) => `'${value.replace(/'/g, "'\\''")}'`

const getCommandOutput = (err) => [err.stdout, err.stderr]
  .filter(output => output && output.trim())
  .join("\n")
  .trim()

const tailOutput = (output, lineCount = warningOutputLines) => {
  const lines = output.split(/\r?\n/).filter(line => line.length)

  return lines.slice(-lineCount).join("\n")
}

export const formatSetupWarning = (err, options = {}) => {
  const output = getCommandOutput(err)

  if (!output) {
    return err.message
  }

  const displayedOutput = options.verbose ? output : tailOutput(output)
  const outputLabel = options.verbose
    ? "command output"
    : `last ${warningOutputLines} output lines`

  return `${err.message}\n${outputLabel}:\n${displayedOutput}`
}

const silentSpinner = {
  setSpinnerTitle: () => {},
  setSpinnerString: () => {},
  start: () => {},
  stop: () => {},
}

export const runSetupCommand = (label, command, options = {}, spinner = silentSpinner, runCommand = exec, execOptions = {}) => {
  const verbose = Boolean(options.verbose)
  const env = {
    ...process.env,
    ...execOptions.env,
  }
  const timeout = execOptions.timeout || commandTimeoutMs

  spinner.stop(true)
  console.log(`${label}...`.cyan)

  if (verbose) {
    console.log(`$ ${command}`.yellow)
  }

  return new Promise((resolve, reject) => {
    let streamingOutput = false
    const child = runCommand(command, {
      ...execOptions,
      env,
      timeout,
      maxBuffer: execOptions.maxBuffer || 1024 * 1024 * 10,
    }, (err, stdout = "", stderr = "") => {
      if (verbose && !streamingOutput && stdout) {
        process.stdout.write(stdout)
      }
      if ((verbose || err) && !streamingOutput && stderr) {
        process.stderr.write(stderr)
      }

      if (err) {
        const timeoutMessage = err.killed ? ` after ${timeout}ms` : ""
        const failed = new Error(`${label} failed${timeoutMessage}: ${err.message}`)

        failed.cause = err
        failed.stdout = stdout
        failed.stderr = stderr
        return reject(failed)
      }

      resolve({ stdout, stderr })
    })

    if (verbose && child && child.stdout && child.stderr) {
      streamingOutput = true
      child.stdout.on("data", chunk => process.stdout.write(chunk))
      child.stderr.on("data", chunk => process.stderr.write(chunk))
    }
  })
}

export const loadUserConfig = (homeDir = userHome) => {
  const configPath = path.join(homeDir, ".shellfection.json")

  if (!fs.existsSync(configPath)) {
    return {}
  }

  return JSON.parse(fs.readFileSync(configPath).toString())
}

export const buildConfig = (baseConfig = defaultConfig, localConfig = {}) => {
  const mergedConfig = _.cloneDeep(baseConfig)

  mergedConfig.casks = _.union(baseConfig.casks || [], localConfig.casks || [])
  mergedConfig.clones = _.unionBy(baseConfig.clones || [], localConfig.clones || [], (o) => JSON.stringify(o))
  mergedConfig.gist = localConfig.gist || baseConfig.gist
  mergedConfig.gists = _.union(baseConfig.gists || [], localConfig.gists || [])
  mergedConfig.packages = _.merge({}, baseConfig.packages || {}, localConfig.packages || {})
  mergedConfig.pip = _.merge({}, baseConfig.pip || {}, localConfig.pip || {})
  mergedConfig.npm = _.merge({}, baseConfig.npm || {}, localConfig.npm || {})
  mergedConfig.symlinks = _.unionBy(baseConfig.symlinks || [], localConfig.symlinks || [], (o) => JSON.stringify(o))
  mergedConfig.themer = _.merge({}, baseConfig.themer || {}, localConfig.themer || {})

  return mergedConfig
}

let userConfig = loadUserConfig()
let config = buildConfig(defaultConfig, userConfig)

const { casks, clones, gist, gists, packages, pip, symlinks, themer, npm } = config

const convertSvgToPng = (svgPath, outputDir) => {
  const parsedPath = path.parse(svgPath)
  const outputPath = path.join(outputDir, `${parsedPath.name}.png`)

  return sharp(svgPath).png().toFile(outputPath)
}

async function getGistsProvider (spinner, username, password) {
  return new Promise((resolve) => {
    spinner.stop(true)

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    })

    if (!username) {
      rl.question("GitHub username: ", (username) => {
        rl.question("GitHub password: ", (password) => {
          spinner.start()

          resolve(new Gists({
            username,
            password,
          }))
        })
      })
    }
    else {
      spinner.start()

      resolve(new Gists({
        username,
        password,
      }))
    }

  })
}

export function sync(spinner) {
  spinner.setSpinnerTitle("getting os type...".blue)
  spinner.setSpinnerString(11)
  spinner.start()

  return util.getOSType()
    .then((osType) => {
      if (osType === util.OSType.Darwin) {
        spinner.setSpinnerTitle("writing Brewfile...".blue)

        return util.dumpHomebrewBundle(osType, brewfilePath)
          .then(() => {
            spinner.stop(true)
          })
      }

      spinner.setSpinnerTitle("getting casks and packages...".blue)

      return Promise.all([
        util.getCasks(osType),
        util.getPackages(osType),
      ])
        .then(([casks, packages]) => {
          userConfig.casks = casks
          userConfig.packages = _.merge(packages, userConfig.packages)

          spinner.setSpinnerTitle("writing to ~/.shellfection.json...".blue)

          fs.writeFileSync(`${userHome}/.shellfection.json`, JSON.stringify(userConfig, false, "  "))

          spinner.stop(true)
        })
    })
}

export async function gistDownload(spinner) {
  spinner.setSpinnerTitle("getting gist provider...".blue)
  spinner.setSpinnerString(11)
  spinner.start()

  const gistsProvider = await getGistsProvider(spinner)

  spinner.setSpinnerTitle("getting gist...".blue)

  return gistsProvider.get(gist)
    .then((res) => {
      spinner.setSpinnerTitle("updating local files...".blue)

      gists.forEach((fileName) => {
        const match = res.body.files[fileName]

        if (match) {
          fs.writeFileSync(`${userHome}/${fileName}`, match.content)
        }
      })

      spinner.stop(true)
    })
}

function getEmptyFiles(fileNames) {
  const files = {}

  fileNames.forEach((fileName) => files[fileName] = null)

  return files
}

function getFiles(fileNames) {
  const files = {}

  fileNames.forEach((fileName) => {
    const fileContents = fs.readFileSync(`${userHome}/${fileName}`)

    files[fileName] = {
      filename: fileName,
      size: fileContents.length,
      content: fileContents.toString(),
    }
  })

  return files
}

export async function gistUpload(spinner) {
  spinner.setSpinnerTitle("getting gist provider...".blue)
  spinner.setSpinnerString(11)
  spinner.start()

  const gistsProvider = await getGistsProvider(spinner)

  spinner.setSpinnerTitle("clearing gist...".blue)

  let options

  return gistsProvider.get(gist)
    .then((res) => {
      options = res.body
      const fileNames = Object.keys(res.body.files)
      if (!fileNames.length) {
        return Promise.resolve()
      }
      options.files = getEmptyFiles(fileNames)
      return gistsProvider.edit(gist, options)
    })
    .then(() => {
      spinner.setSpinnerTitle("updating gist...".blue)

      options.files = getFiles(gists)

      return gistsProvider.edit(gist, options)
    })
    .then(() => spinner.stop(true))
}

export const install = (options, spinner) => {
  if (options.verbose) {
    spinner = silentSpinner
  }

  spinner.setSpinnerTitle("detecting OS...".blue)
  spinner.setSpinnerString(11)
  spinner.start()

  return util.getOSType()
    .then((osType) => {
      spinner.stop(true)

      console.log(`detected ${Symbol.keyFor(osType).yellow}`.cyan)

      spinner.start()

      if (options.skipPackages) {
        return Promise.resolve([osType, []])
      }

      if (osType === util.OSType.Darwin) {
        spinner.setSpinnerTitle("installing Homebrew bundle...".blue)

        return util.installHomebrewBundle(osType, brewfilePath)
          .then((installStatus) => {
            spinner.stop(true)

            if (installStatus === util.InstallStatus.Installed) {
              console.log(`${"installed".cyan} ${"Homebrew bundle".green}`)
            }
            else if (installStatus === util.InstallStatus.Failed) {
              console.log(`${"failed to install".cyan} ${"Homebrew bundle".red}`)
            }
            else if (installStatus === util.InstallStatus.NoChanges) {
              console.log(`${"no changes to".cyan} ${"Homebrew bundle".yellow}`)
            }

            spinner.start()

            return [osType, [installStatus]]
          })
      }

      spinner.setSpinnerTitle("installing packages...".blue)

      return util.series(Object.keys(packages).map(pkgId => () => {
        const pkg = packages[pkgId]

        spinner.setSpinnerTitle(`installing ${pkgId}`.blue)

        return util.installPackage(osType, pkg)
          .then((installStatus) => {
            spinner.stop(true)

            if (installStatus === util.InstallStatus.Installed) {
              console.log(`${"installed".cyan} ${pkgId.green}`)
            }
            else if (installStatus === util.InstallStatus.Failed) {
              console.log(`${"failed to install".cyan} ${pkgId.red}`)
            }
            else if (installStatus === util.InstallStatus.NoChanges) {
              console.log(`${"no changes to".cyan} ${pkgId.yellow}`)
            }

            spinner.start()

            return installStatus
          })
      }))
        .then((results) => [osType, results])
    })
    .then(([osType, results]) => {
      const resultMap = _.countBy(
        results,
        (result) => Symbol.keyFor(result),
      )

      resultMap.Installed = resultMap.Installed || 0
      resultMap.Failed = resultMap.Failed || 0
      resultMap.NoChanges = resultMap.NoChanges || 0

      spinner.stop(true)

      console.log(`${"packages installed".cyan} ${resultMap.Installed.toString().green} ${"failed".cyan} ${resultMap.Failed.toString().red} ${"no changes".cyan} ${resultMap.NoChanges.toString().yellow}`)

      spinner.start()

      if (resultMap.Failed > 0) {
        throw new Error(`${resultMap.Failed} package install failed`)
      }

      if (options.skipPackages || osType === util.OSType.Darwin) {
        return Promise.resolve([])
      }

      spinner.setSpinnerTitle("installing casks...".blue)

      return util.series(casks.map(cask => () => {
        spinner.setSpinnerTitle(`installing ${cask}`.blue)

        return util.installCask(osType, cask)
          .then((installStatus) => {
            spinner.stop(true)

            if (installStatus === util.InstallStatus.Installed) {
              console.log(`${"installed".cyan} ${cask.green}`)
            }
            else if (installStatus === util.InstallStatus.Failed) {
              console.log(`${"failed to install".cyan} ${cask.red}`)
            }
            else if (installStatus === util.InstallStatus.NoChanges) {
              console.log(`${"no changes to".cyan} ${cask.yellow}`)
            }

            spinner.start()

            return installStatus
          })
      }))
    })
    .then((results) => {
      const resultMap = _.countBy(
        results,
        (result) => Symbol.keyFor(result),
      )

      resultMap.Installed = resultMap.Installed || 0
      resultMap.Failed = resultMap.Failed || 0
      resultMap.NoChanges = resultMap.NoChanges || 0

      spinner.stop(true)

      console.log(`${"casks installed".cyan} ${resultMap.Installed.toString().green} ${"failed".cyan} ${resultMap.Failed.toString().red} ${"no changes".cyan} ${resultMap.NoChanges.toString().yellow}`)

      spinner.start()

      if (resultMap.Failed > 0) {
        throw new Error(`${resultMap.Failed} cask install failed`)
      }

      installSymlinks(symlinks, options, spinner)
      installClones(clones, options, spinner)

      spinner.stop()

      return installOhMyZsh(options, spinner)
    })
    .then(() => installVundle(options, spinner))
    .then(() => installNpm(options, spinner))
    .then(() => installThemer(options, spinner))
    .then(() => installPip(options, spinner))
    .catch((err) => {
      spinner.stop(true)
      console.error(err)
      throw err
    })
}

export const getOhMyZshInstallCommand = (homeDir = userHome) => {
  const zshDir = path.join(homeDir, ".oh-my-zsh")

  return [
    `HOME=${shellQuote(homeDir)}`,
    `ZSH=${shellQuote(zshDir)}`,
    "RUNZSH=no",
    "CHSH=no",
    "KEEP_ZSHRC=yes",
    `sh -c "$(curl -fsSL ${ohMyZshInstallUrl})"`,
  ].join(" ")
}

export const installOhMyZsh = (options, spinner, homeDir = userHome, runCommand = exec) => {
  const zshDir = path.join(homeDir, ".oh-my-zsh")

  if (fs.existsSync(zshDir)) {
    console.log(`${"already exists".cyan} ${".oh-my-zsh".yellow}`)
    return Promise.resolve()
  }

  spinner.setSpinnerTitle("installing oh-my-zsh...".blue)

  return runSetupCommand("installing oh-my-zsh", getOhMyZshInstallCommand(homeDir), options, spinner, runCommand)
    .then(() => console.log(`${"installed".cyan} ${"oh-my-zsh".yellow}`))
}

export const getVundleCloneCommand = (homeDir = userHome) => {
  const vundleDir = path.join(homeDir, ".vim/bundle/Vundle.vim")

  return `git clone ${vundleRepoUrl} ${shellQuote(vundleDir)}`
}

export const getVundlePluginInstallCommand = (homeDir = userHome) => {
  return [
    "if command -v vim >/dev/null 2>&1; then",
    `HOME=${shellQuote(homeDir)}`,
    "GIT_TERMINAL_PROMPT=0",
    "GIT_ASKPASS=true",
    "vim",
    "-N",
    `-u ${shellQuote(path.join(homeDir, ".vimrc"))}`,
    "-E",
    "-s",
    "-c 'PluginInstall!'",
    "-c 'qall!';",
    "else echo 'vim not found; skipping Vundle PluginInstall'; fi",
  ].join(" ")
}

export const getVundleInstallCommand = (homeDir = userHome) => {
  const vundleDir = path.join(homeDir, ".vim/bundle/Vundle.vim")

  return [
    `if [ -d ${shellQuote(vundleDir)} ]; then`,
    "echo 'already exists .vim/bundle/Vundle.vim';",
    "else",
    getVundleCloneCommand(homeDir),
    "; fi;",
    getVundlePluginInstallCommand(homeDir),
  ].join(" ")
}

export const installVundle = (options, spinner, homeDir = userHome, runCommand = exec) => {
  const vundleDir = path.join(homeDir, ".vim/bundle/Vundle.vim")
  const exists = fs.existsSync(vundleDir)

  if (exists) {
    console.log(`${"already exists".cyan} ${".vim/bundle/Vundle.vim".yellow}`)
  }

  spinner.setSpinnerTitle("installing Vundle...".blue)

  fs.mkdirSync(path.dirname(vundleDir), { recursive: true })

  const cloneVundle = exists
    ? Promise.resolve()
    : runSetupCommand("cloning Vundle", getVundleCloneCommand(homeDir), options, spinner, runCommand, {
      env: {
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "true",
      },
    })

  return cloneVundle
    .then(() => runSetupCommand("running Vundle PluginInstall", getVundlePluginInstallCommand(homeDir), options, spinner, runCommand, {
      env: {
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: "true",
      },
      timeout: commandTimeoutMs,
    }).catch((err) => {
      console.warn(`${"warning".yellow} Vundle PluginInstall exited non-zero; continuing because Vim plugins are optional.\n${formatSetupWarning(err, options)}`)
    }))
    .then(() => {
      console.log(`${"finished".cyan} ${"Vundle setup".yellow}`)
    })
}

export const installSymlinks = (links, options, spinner, homeDir = userHome, sourceDir = path.resolve(__dirname, "..")) => {
  spinner.setSpinnerTitle("symlinking...".blue)

  links.forEach(([from, to]) => {
    spinner.stop(true)

    const targetPath = path.join(homeDir, to)
    const exists = fs.existsSync(targetPath)
    const clean = options.clean || options.deepClean || options.force

    if (clean && exists) {
      fs.unlinkSync(targetPath)
    }

    if (!clean && exists) {
      console.log(`${"already exists".cyan} ${to.yellow}`)
    }

    if (!exists || clean) {
      console.log(`${"symlinked".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.symlinkSync(path.join(sourceDir, from), targetPath)
    }

    spinner.start()
  })
}

export const installClones = (cloneEntries, options, spinner, homeDir = userHome, sourceDir = path.resolve(__dirname, "..")) => {
  spinner.setSpinnerTitle("cloning local configuration...".blue)

  cloneEntries.forEach(([from, to]) => {
    spinner.stop(true)

    const targetPath = path.join(homeDir, to)
    const exists = fs.existsSync(targetPath)

    if ((options.deepClean || options.force) && exists) {
      fse.removeSync(targetPath)
    }

    if (!options.deepClean && !options.force && exists) {
      console.log(`${"already exists".cyan} ${to.yellow}`)
    }

    if (!exists || options.deepClean || options.force) {
      console.log(`${"copied".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fse.copySync(path.join(sourceDir, from), targetPath)
    }

    spinner.start()
  })
}

export const installNpm = (options, spinner) => {
  spinner.start()
  spinner.setSpinnerTitle("installing npm packages...".blue)

  return util.series(Object.keys(npm).map(pkg => () => {
    const pkgWVersion = `${pkg}@${npm[pkg]}`

    spinner.setSpinnerTitle(`${"installing".blue} ${pkgWVersion.yellow}`)
    return util.installNpm(pkgWVersion)
      .then(() => {
        spinner.stop(true)

        console.log(`${"installed".cyan} ${pkgWVersion.yellow}`)

        spinner.start()
      })
  }))
    .then(() => {
      spinner.stop(true)
    })
}

export const installPip = (options, spinner) => {
  spinner.start()
  spinner.setSpinnerTitle("installing pip packages...".blue)

  return util.series(Object.keys(pip).filter(pkg => pip[pkg]).map(pkg => () => {
    const pkgWVersion = `${pkg}${pip[pkg].version ? `==${pip[pkg].version}` : ""}`

    spinner.setSpinnerTitle(`${"installing".blue} ${pkgWVersion.yellow}`)
    return util.installPip(pkgWVersion)
      .then(() => {
        spinner.stop(true)

        console.log(`${"installed".cyan} ${pkgWVersion.yellow}`)

        spinner.start()
      })
  }))
    .then(() => {
      spinner.stop(true)
    })
}

export const installThemer = (options, spinner) => {
  return new Promise((resolve, reject) => {
    spinner.start()
    spinner.setSpinnerTitle("building themer...".blue)

    const templates = themer.templates.map(t => `-t ${t}`).join(" ")

    runSetupCommand("building themer", `themer -c ${themer.colorscheme} ${templates} -o ${__dirname}/../themer`, options, spinner)
      .then(() => {
        spinner.stop(true)

        console.log(`${"successfully built themer files in".cyan} ${"themer".yellow}`)

        spinner.start()

        spinner.setSpinnerTitle("symlinking theme files...".blue)

        themer.symlinks.forEach(([from, to]) => {
          spinner.stop(true)

          const targetPath = path.join(userHome, to)
          const exists = fs.existsSync(targetPath)

          if (exists) {
            fs.unlinkSync(targetPath)
          }

          console.log(`${"symlinked".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

          fs.mkdirSync(path.dirname(targetPath), { recursive: true })
          fs.symlinkSync(path.join(__dirname, "..", from), targetPath)

          spinner.start()
        })

        spinner.setSpinnerTitle("converting wallpapers...".blue)

        const log = console.log

        console.log = () => {}

        Promise.all(themer.svgToPngDirectories.map(spdir => {
          const svgFiles = fs.readdirSync(`${__dirname}/../${spdir}`).filter(name => /\.svg$/.test(name))

          return Promise.all(svgFiles.map(svgFile =>
            convertSvgToPng(`${__dirname}/../${spdir}/${svgFile}`, `${__dirname}/../${spdir}`)
          ))
        }).reduce((a, b) => a.concat(b), []))
          .then((result) => {
            console.log = log

            spinner.stop(true)

            console.log(`${"successfully converted".cyan} ${result.length.toString().yellow} ${"directories of svgs to pngs".cyan}`)

            resolve()
          })
      })
      .catch(reject)
  })
}
