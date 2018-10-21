import * as os from "os"
import * as ce from "command-exists"
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
    return installDarwinPackage(pkg)
  }
  else if (osType === OSType.LinuxApt) {
    return installAptPackage(pkg)
  }
  else if (osType === OSType.LinuxYum) {
    return installYumPackage(pkg)
  }

  return Promise.reject(new Error(`cannot install package "${pkg.id}" on unknown OSType "${osType}"`))
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

const installDarwinPackage = (pkg) => {
  if (!pkg.brew) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    exec(`brew list ${pkg.brew} &>/dev/null`, (err) => {
      if (err) {
        return exec(`brew install -y ${pkg.brew}`, (err) => {
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

const getDarwinCasks = () => {
  return new Promise((resolve, reject) => {
    exec("brew cask ls -1", (err, stdout) => {
      if (err) {
        reject(err)
      }

      resolve(stdout.split("\n").filter(cask => cask.length))
    })
  })
}

const getDarwinPackages = () => {
  return new Promise((resolve, reject) => {
    exec("brew ls -1", (err, stdout) => {
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
    exec(`apt-get install -y ${pkg.apt}`, (err) => {
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
    exec(`yum install -y ${pkg.yum}`, (err) => {
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
    exec(`pip install ${pkg}`, (err) => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })
}
