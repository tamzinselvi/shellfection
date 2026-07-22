import * as os from "os"
import ce from "command-exists"
import { exec } from "child_process"

const commandExists = (cmd) => {
  return new Promise((resolve, reject) => {
    ce(cmd, (err, commandExists) => {
      if (err) {
        return reject(err)
      }

      resolve(commandExists)
    })
  })
}

export const InstallStatus = {
  Installed: Symbol.for("Installed"),
  Failed: Symbol.for("Failed"),
  NoChanges: Symbol.for("NoChanges"),
}

export const OSType = {
  Darwin: Symbol.for("Darwin"),
  LinuxApt: Symbol.for("LinuxAptGet"),
  LinuxYum: Symbol.for("LinuxYum"),
  Unknown: Symbol.for("Unknown"),
}

export const getOSType = () => {
  const platform = os.platform()

  if (platform === "darwin") {
    return Promise.resolve(OSType.Darwin)
  }
  else if (platform === "linux") {
    return Promise.all([
      commandExists("apt-get"),
      commandExists("yum"),
    ]).then(([aptGetExists, yumExists]) => {
      if (aptGetExists) {
        return OSType.LinuxApt
      }
      else if (yumExists) {
        return OSType.LinuxYum
      }

      return OSType.Unknown
    })
  }

  return Promise.resolve(OSType.Unknown)
}

export const getCasks = (osType) => {
  if (osType === OSType.Darwin) {
    return getDarwinCasks()
  }

  return Promise.reject(new Error(`cannot get casks for "${osType}"`))
}

export const getPackages = (osType) => {
  if (osType === OSType.Darwin) {
    return getDarwinPackages()
  }

  return Promise.reject(new Error(`cannot get packages for "${osType}"`))
}

export const installPackage = (osType, pkg) => {
  if (osType === OSType.Darwin) {
    return Promise.resolve()
  }
  else if (osType === OSType.LinuxApt) {
    return installAptPackage(pkg)
  }
  else if (osType === OSType.LinuxYum) {
    return installYumPackage(pkg)
  }

  return Promise.reject(new Error(`cannot install package "${pkg.id}" on unknown OSType "${osType}"`))
}

export const installCask = (osType, cask) => {
  if (osType === OSType.Darwin) {
    return Promise.resolve()
  }

  return Promise.reject(new Error(`cannot install cask "${cask}" on unknown OSType "${osType}"`))
}

export const getInstallCommands = {
  brewBundleCheck: (brewfilePath) => `brew bundle check --file ${brewfilePath}`,
  brewBundleDump: (brewfilePath) => `brew bundle dump --file ${brewfilePath} --force`,
  brewBundleInstall: (brewfilePath) => `brew bundle install --file ${brewfilePath}`,
  aptInstall: (pkg) => `apt-get install -y ${pkg}`,
  yumInstall: (pkg) => `yum install -y ${pkg}`,
  pipInstall: (pkg) => `pip install ${pkg}`,
  npmGlobalInstall: (pkg) => `npm install -g ${pkg}`,
}

export const series = (farr) => {
  const helper = (farr) => {
    if (!farr.length) {
      return Promise.resolve([])
    }

    return farr[0]().then(res => {
      const h = helper(farr.slice(1))

      return h.then(res2 => [res].concat(res2))
    })
  }

  return helper(farr)
}

export const installHomebrewBundle = (osType, brewfilePath) => {
  if (osType !== OSType.Darwin) {
    return Promise.resolve(InstallStatus.NoChanges)
  }

  return new Promise((resolve) => {
    exec(getInstallCommands.brewBundleCheck(brewfilePath), (err) => {
      if (err) {
        return exec(getInstallCommands.brewBundleInstall(brewfilePath), (err) => {
          if (err) {
            return resolve(InstallStatus.Failed)
          }

          resolve(InstallStatus.Installed)
        })
      }

      resolve(InstallStatus.NoChanges)
    })
  })
}

export const dumpHomebrewBundle = (osType, brewfilePath) => {
  if (osType !== OSType.Darwin) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    exec(getInstallCommands.brewBundleDump(brewfilePath), (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

const getDarwinCasks = () => {
  return new Promise((resolve, reject) => {
    exec("brew list --cask -1", (err, stdout) => {
      if (err) {
        reject(err)
      }

      resolve(stdout.split("\n").filter(cask => cask.length))
    })
  })
}

const getDarwinPackages = () => {
  return new Promise((resolve, reject) => {
    exec("brew list --formula -1", (err, stdout) => {
      if (err) {
        reject(err)
      }
      const packages = {}

      stdout.split("\n").filter(pkg => pkg.length).forEach((pkg) => {
        packages[pkg] = { brew: pkg }
      })

      resolve(packages)
    })
  })
}

const installAptPackage = (pkg) => {
  if (!pkg.apt) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    exec(getInstallCommands.aptInstall(pkg.apt), (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

const installYumPackage = (pkg) => {
  if (!pkg.yum) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    exec(getInstallCommands.yumInstall(pkg.yum), (err) => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

export const installPip = (pkg) => {
  if (!pkg) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    exec(getInstallCommands.pipInstall(pkg), (err) => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })
}

export const installNpm = (pkg) => {
  if (!pkg) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    exec(getInstallCommands.npmGlobalInstall(pkg), (err) => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })
}
