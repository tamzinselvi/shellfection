import "colors"
import fs from "fs"
import * as _ from "lodash"
import svgToPng from "svg-to-png"
import userHome from "user-home"
import { exec } from "child_process"

import * as util from "./util"

import defaultConfig from "../config.json"

let config = defaultConfig

if (fs.existsSync(`${userHome}/.shellfection`)) {
  const userConfig = JSON.parse(fs.readFileSync(`${userHome}/.shellfection`))

  config = _.defaultsDeep(userConfig, defaultConfig)
}

const { clones, packages, pip, symlinks, themer } = config

export const install = (options, spinner) => {
  spinner.setSpinnerTitle("detecting OS...".blue)
  spinner.setSpinnerString(11)
  spinner.start()

  return util.getOSType()
    .then((osType) => {
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

      console.log(`${"installed".cyan} ${resultMap.Installed.toString().green} ${"failed".cyan} ${resultMap.Failed.toString().red} ${"no changes".cyan} ${resultMap.NoChanges.toString().yellow}`)

      spinner.start()

      spinner.setSpinnerTitle("symlinking...".blue)

      symlinks.forEach(([from, to]) => {
        spinner.stop(true)

        const exists = fs.existsSync(`${userHome}/${to}`)
        const clean = options.clean || options.deepClean

        if (clean && exists) {
          fs.unlinkSync(`${userHome}/${to}`)
        }

        if (!clean && exists) {
          console.log(`${"already exists".cyan} ${to.yellow}`)
        }

        if (!exists || clean) {
          console.log(`${"symlinked".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

          fs.symlinkSync(`${__dirname}/../${from}`, `${userHome}/${to}`)
        }

        spinner.start()
      })

      spinner.setSpinnerTitle("cloning local configuration...".blue)

      clones.forEach(([from, to]) => {
        spinner.stop(true)

        const exists = fs.existsSync(`${userHome}/${to}`)

        if (options.deepClean && exists) {
          fs.unlinkSync(`${userHome}/${to}`)
        }

        if (!options.deepClean && exists) {
          console.log(`${"already exists".cyan} ${to.yellow}`)
        }

        if (!exists || options.deepClean) {
          console.log(`${"copied".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

          fs.copyFileSync(`${__dirname}/../${from}`, `${userHome}/${to}`)
        }

        spinner.start()
      })

      spinner.stop()

      return installThemer(options, spinner)
    })
    .then(() => installPip(options, spinner))
    .catch(err => console.error(err))
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

    exec(`$(npm bin)/themer -c ${themer.colorscheme} -t themer-tmux -t themer-vim -t themer-iterm -t themer-wallpaper-octagon -t themer-wallpaper-block-wave -o themer`, (err) => {
      if (err) {
        reject(err)
      }

      spinner.stop(true)

      console.log(`${"successfully built themer files in".cyan} ${"themer".yellow}`)

      spinner.start()

      spinner.setSpinnerTitle("symlinking theme files...".blue)

      themer.symlinks.forEach(([from, to]) => {
        spinner.stop(true)

        const exists = fs.existsSync(`${userHome}/${to}`)

        if (exists) {
          fs.unlinkSync(`${userHome}/${to}`)
        }

        console.log(`${"symlinked".cyan} ${from.yellow} ${"to".cyan} ${to.yellow}`)

        fs.symlinkSync(`${__dirname}/../${from}`, `${userHome}/${to}`)

        spinner.start()
      })

      spinner.setSpinnerTitle("converting wallpapers...".blue)

      const log = console.log

      console.log = () => {}

      Promise.all(themer.svgToPngDirectories.map(spdir => {
        const svgFiles = fs.readdirSync(`${__dirname}/../${spdir}`).filter(name => /\.svg$/.test(name))

        return Promise.all(svgFiles.map(svgFile =>
          svgToPng.convert(`${__dirname}/../${spdir}/${svgFile}`, `${__dirname}/../${spdir}`)
        ))
      }).reduce((a, b) => a.concat(b), []))
        .then((result) => {
          console.log = log

          spinner.stop(true)

          console.log(`${"successfully converted".cyan} ${result.length.toString().yellow} ${"directories of svgs to pngs".cyan}`)

          resolve()
        })
    })
  })
}
