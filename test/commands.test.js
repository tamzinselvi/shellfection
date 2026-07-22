jest.mock("fs", () => {
  const actual = jest.requireActual("fs")

  return {
    ...actual,
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(actual.readFileSync),
    readdirSync: jest.fn(() => []),
    symlinkSync: jest.fn(),
    unlinkSync: jest.fn(),
  }
})

jest.mock("fs-extra", () => ({
  copySync: jest.fn(),
  removeSync: jest.fn(),
}))

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, options, callback) => {
    if (typeof options === "function") {
      return options(null)
    }

    return callback(null)
  }),
}))

jest.mock("sharp", () => jest.fn(() => ({
  png: jest.fn(() => ({
    toFile: jest.fn(() => Promise.resolve()),
  })),
})))

jest.mock("../src/util", () => ({
  OSType: {
    Darwin: Symbol.for("Darwin"),
    LinuxApt: Symbol.for("LinuxAptGet"),
    LinuxYum: Symbol.for("LinuxYum"),
    Unknown: Symbol.for("Unknown"),
  },
  InstallStatus: {
    Installed: Symbol.for("Installed"),
    Failed: Symbol.for("Failed"),
    NoChanges: Symbol.for("NoChanges"),
  },
  getOSType: jest.fn(() => Promise.resolve(Symbol.for("Darwin"))),
  series: jest.fn((tasks) => tasks.reduce(
    (promise, task) => promise.then((results) => task().then((result) => results.concat(result))),
    Promise.resolve([]),
  )),
  installHomebrewBundle: jest.fn(() => Promise.resolve(Symbol.for("NoChanges"))),
  installPackage: jest.fn(() => Promise.resolve(Symbol.for("NoChanges"))),
  installCask: jest.fn(() => Promise.resolve(Symbol.for("NoChanges"))),
  installNpm: jest.fn(() => Promise.resolve()),
  installPip: jest.fn(() => Promise.resolve()),
}))

import fs from "fs"
import fse from "fs-extra"
import * as util from "../src/util"
import { exec } from "child_process"
import defaultConfig from "../config.json"
import sampleConfig from "../config/shellfection.json"
import {
  buildConfig,
  formatSetupWarning,
  getOhMyZshInstallCommand,
  getVundleCloneCommand,
  getVundleInstallCommand,
  getVundlePluginInstallCommand,
  install,
  installClones,
  installNpm,
  installOhMyZsh,
  installPip,
  installSymlinks,
  installThemer,
  installVundle,
  loadUserConfig,
  runSetupCommand,
} from "../src/commands"

const spinner = {
  setSpinnerTitle: jest.fn(),
  setSpinnerString: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "log").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  console.log.mockRestore()
  console.error.mockRestore()
})

describe("install orchestration", () => {
  test("rejects when package installation reports a failure", async () => {
    util.installHomebrewBundle.mockResolvedValueOnce(util.InstallStatus.Failed)

    await expect(install({}, spinner)).rejects.toThrow("package install failed")
  })

  test("installs npm packages with configured versions in series", async () => {
    await installNpm({}, spinner)

    expect(util.installNpm).toHaveBeenCalledWith("themer@latest")
    expect(util.installNpm).toHaveBeenCalledTimes(1)
    expect(util.series).toHaveBeenCalledTimes(1)
    expect(spinner.stop).toHaveBeenCalledWith(true)
  })

  test("skips pip install when the default pip inventory is empty", async () => {
    await installPip({}, spinner)

    expect(util.installPip).not.toHaveBeenCalled()
    expect(util.series).toHaveBeenCalledTimes(1)
    expect(spinner.stop).toHaveBeenCalledWith(true)
  })

  test("builds and links current themer outputs consumed by shipped configs", async () => {
    await installThemer({}, spinner)

    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining("themer -c github-universe -t tmux -t vim -t iterm -t wallpaper-octagon -t wallpaper-triangles -t chrome -t slack -t wallpaper-block-wave -o "),
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    )
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringMatching(/\.vim\/colors$/), { recursive: true })
    expect(fs.symlinkSync).toHaveBeenCalledWith(
      expect.stringMatching(/themer\/GitHub Universe\/Vim\/ThemerGitHubUniverse\.vim$/),
      expect.stringMatching(/\.vim\/colors\/themer\.vim$/),
    )
    expect(fs.symlinkSync).toHaveBeenCalledWith(
      expect.stringMatching(/themer\/GitHub Universe\/tmux\/themer-tmux\.dark\.double\.v1\.tmuxtheme$/),
      expect.stringMatching(/\.themer\.tmuxtheme$/),
    )
  })
})

describe("setup command runner", () => {
  test("prints command output in verbose mode", async () => {
    const runCommand = jest.fn((command, options, callback) => callback(null, "out\n", "err\n"))
    jest.spyOn(process.stdout, "write").mockImplementation(() => {})
    jest.spyOn(process.stderr, "write").mockImplementation(() => {})

    await runSetupCommand("running sample", "sample --flag", { verbose: true }, spinner, runCommand)

    expect(runCommand).toHaveBeenCalledWith(
      "sample --flag",
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    )
    expect(console.log).toHaveBeenCalledWith("$ sample --flag".yellow)
    expect(process.stdout.write).toHaveBeenCalledWith("out\n")
    expect(process.stderr.write).toHaveBeenCalledWith("err\n")

    process.stdout.write.mockRestore()
    process.stderr.write.mockRestore()
  })

  test("surfaces stderr when a setup command fails", async () => {
    const runCommand = jest.fn((command, options, callback) => callback(new Error("boom"), "", "failed\n"))
    jest.spyOn(process.stderr, "write").mockImplementation(() => {})

    await expect(runSetupCommand("running sample", "sample --flag", {}, spinner, runCommand))
      .rejects.toMatchObject({
        message: expect.stringContaining("running sample failed"),
        stderr: "failed\n",
      })

    expect(process.stderr.write).toHaveBeenCalledWith("failed\n")
    process.stderr.write.mockRestore()
  })

  test("formats setup warnings with the tail of captured output", () => {
    const err = new Error("running sample failed")
    err.stdout = Array.from({ length: 45 }, (_, index) => `out ${index + 1}`).join("\n")
    err.stderr = "stderr detail"

    const warning = formatSetupWarning(err)

    expect(warning).toContain("running sample failed")
    expect(warning).toContain("last 40 output lines")
    expect(warning).toContain("out 7")
    expect(warning).toContain("stderr detail")
    expect(warning).not.toContain("out 6")
  })

  test("formats verbose setup warnings with full captured output", () => {
    const err = new Error("running sample failed")
    err.stdout = Array.from({ length: 45 }, (_, index) => `out ${index + 1}`).join("\n")

    const warning = formatSetupWarning(err, { verbose: true })

    expect(warning).toContain("command output")
    expect(warning).toContain("out 1")
    expect(warning).toContain("out 45")
  })
})

describe("home file installation helpers", () => {
  test("leaves an existing symlink target untouched without clean", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installSymlinks([["config/vimrc", ".vimrc"]], {}, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fs.unlinkSync).not.toHaveBeenCalled()
    expect(fs.symlinkSync).not.toHaveBeenCalled()
  })

  test("replaces an existing symlink target when clean is enabled", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installSymlinks([["config/vimrc", ".vimrc"]], { clean: true }, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/shellfection-home/.vimrc")
    expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp/shellfection-home", { recursive: true })
    expect(fs.symlinkSync).toHaveBeenCalledWith("/tmp/shellfection-src/config/vimrc", "/tmp/shellfection-home/.vimrc")
  })

  test("overwrites an existing symlink target when force is enabled", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installSymlinks([["config/vimrc", ".vimrc"]], { force: true }, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/shellfection-home/.vimrc")
    expect(fs.symlinkSync).toHaveBeenCalledWith("/tmp/shellfection-src/config/vimrc", "/tmp/shellfection-home/.vimrc")
  })

  test("creates parent directories before symlinking a nested target", () => {
    fs.existsSync.mockReturnValueOnce(false)

    installSymlinks([["config/tmux.conf", ".config/tmux/tmux.conf"]], {}, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp/shellfection-home/.config/tmux", { recursive: true })
    expect(fs.symlinkSync).toHaveBeenCalledWith("/tmp/shellfection-src/config/tmux.conf", "/tmp/shellfection-home/.config/tmux/tmux.conf")
  })

  test("leaves existing clone targets unless deep-clean is enabled", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installClones([["config/bashrc.local", ".bashrc.local"]], {}, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fse.copySync).not.toHaveBeenCalled()
    expect(fse.removeSync).not.toHaveBeenCalled()
  })

  test("replaces existing clone targets when deep-clean is enabled", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installClones([["config/bashrc.local", ".bashrc.local"]], { deepClean: true }, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fse.removeSync).toHaveBeenCalledWith("/tmp/shellfection-home/.bashrc.local")
    expect(fse.copySync).toHaveBeenCalledWith("/tmp/shellfection-src/config/bashrc.local", "/tmp/shellfection-home/.bashrc.local")
  })

  test("overwrites existing clone targets when force is enabled", () => {
    fs.existsSync.mockReturnValueOnce(true)

    installClones([["config/bashrc.local", ".bashrc.local"]], { force: true }, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fse.removeSync).toHaveBeenCalledWith("/tmp/shellfection-home/.bashrc.local")
    expect(fse.copySync).toHaveBeenCalledWith("/tmp/shellfection-src/config/bashrc.local", "/tmp/shellfection-home/.bashrc.local")
  })

  test("creates parent directories before copying a nested clone target", () => {
    fs.existsSync.mockReturnValueOnce(false)

    installClones([["config/bashrc.local", ".config/shellfection/bashrc.local"]], {}, spinner, "/tmp/shellfection-home", "/tmp/shellfection-src")

    expect(fs.mkdirSync).toHaveBeenCalledWith("/tmp/shellfection-home/.config/shellfection", { recursive: true })
    expect(fse.copySync).toHaveBeenCalledWith("/tmp/shellfection-src/config/bashrc.local", "/tmp/shellfection-home/.config/shellfection/bashrc.local")
  })
})

describe("oh-my-zsh setup", () => {
  test("builds an unattended installer command that preserves shellfection zshrc", () => {
    const command = getOhMyZshInstallCommand("/tmp/shellfection-home")

    expect(command).toContain("HOME='/tmp/shellfection-home'")
    expect(command).toContain("ZSH='/tmp/shellfection-home/.oh-my-zsh'")
    expect(command).toContain("RUNZSH=no")
    expect(command).toContain("CHSH=no")
    expect(command).toContain("KEEP_ZSHRC=yes")
    expect(command).toContain("curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh")
  })

  test("skips installer when oh-my-zsh already exists", async () => {
    const runCommand = jest.fn()
    fs.existsSync.mockReturnValueOnce(true)

    await installOhMyZsh({}, spinner, "/tmp/shellfection-home", runCommand)

    expect(runCommand).not.toHaveBeenCalled()
  })

  test("runs installer when oh-my-zsh is missing", async () => {
    const runCommand = jest.fn((command, options, callback) => callback())
    fs.existsSync.mockReturnValueOnce(false)

    await installOhMyZsh({}, spinner, "/tmp/shellfection-home", runCommand)

    expect(runCommand).toHaveBeenCalledWith(
      getOhMyZshInstallCommand("/tmp/shellfection-home"),
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    )
  })
})

describe("Vundle setup", () => {
  test("builds an idempotent Vundle install command with guarded plugin install", () => {
    const command = getVundleInstallCommand("/tmp/shellfection-home")

    expect(getVundleCloneCommand("/tmp/shellfection-home")).toContain("git clone https://github.com/VundleVim/Vundle.vim.git")
    expect(getVundlePluginInstallCommand("/tmp/shellfection-home")).toContain("GIT_TERMINAL_PROMPT=0")
    expect(getVundlePluginInstallCommand("/tmp/shellfection-home")).toContain("GIT_ASKPASS=true")
    expect(getVundlePluginInstallCommand("/tmp/shellfection-home")).toContain("vim -N -u '/tmp/shellfection-home/.vimrc' -E -s -c 'PluginInstall!' -c 'qall!'")
    expect(command).toContain("/tmp/shellfection-home/.vim/bundle/Vundle.vim")
    expect(command).toContain("PluginInstall!")
    expect(command).toContain("qall!")
  })

  test("skips clone but still runs plugin install when Vundle already exists", async () => {
    const runCommand = jest.fn((command, options, callback) => callback())
    fs.existsSync.mockReturnValueOnce(true)

    await installVundle({}, spinner, "/tmp/shellfection-home", runCommand)

    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(runCommand).toHaveBeenCalledWith(
      getVundlePluginInstallCommand("/tmp/shellfection-home"),
      expect.objectContaining({ timeout: expect.any(Number) }),
      expect.any(Function),
    )
  })

  test("runs installer when Vundle is missing", async () => {
    const runCommand = jest.fn((command, options, callback) => callback())
    fs.existsSync.mockReturnValueOnce(false)

    await installVundle({}, spinner, "/tmp/shellfection-home", runCommand)

    expect(runCommand).toHaveBeenNthCalledWith(
      1,
      getVundleCloneCommand("/tmp/shellfection-home"),
      expect.objectContaining({
        env: expect.objectContaining({
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "true",
        }),
        timeout: expect.any(Number),
      }),
      expect.any(Function),
    )
    expect(runCommand).toHaveBeenNthCalledWith(
      2,
      getVundlePluginInstallCommand("/tmp/shellfection-home"),
      expect.objectContaining({
        env: expect.objectContaining({
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "true",
        }),
        timeout: expect.any(Number),
      }),
      expect.any(Function),
    )
  })

  test("warns and continues when Vundle plugin install fails", async () => {
    const runCommand = jest.fn((command, options, callback) => callback(new Error("vim failed"), "", "plugin error\n"))
    jest.spyOn(console, "warn").mockImplementation(() => {})
    jest.spyOn(process.stderr, "write").mockImplementation(() => {})
    fs.existsSync.mockReturnValueOnce(true)

    await expect(installVundle({}, spinner, "/tmp/shellfection-home", runCommand))
      .resolves.toBeUndefined()

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Vundle PluginInstall exited non-zero; continuing"))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("plugin error"))
    console.warn.mockRestore()
    process.stderr.write.mockRestore()
  })
})

describe("config schema loading", () => {
  test("sample config uses the supported top-level value shapes", () => {
    expect(typeof sampleConfig.gist).toBe("string")
    expect(Array.isArray(sampleConfig.gists)).toBe(true)
    expect(Array.isArray(sampleConfig.symlinks)).toBe(true)
    expect(Array.isArray(sampleConfig.clones)).toBe(true)
    expect(sampleConfig.npm).toEqual({})
  })

  test("merges sparse user config without dropping default npm or gists shape", () => {
    const mergedConfig = buildConfig(defaultConfig, {
      gist: "abc123",
      gists: [".gitconfig"],
      npm: { eslint: "latest" },
    })

    expect(mergedConfig.gist).toBe("abc123")
    expect(mergedConfig.gists).toEqual([".gitconfig"])
    expect(mergedConfig.npm).toEqual({
      themer: "latest",
      eslint: "latest",
    })
  })

  test("loads user config from an injected home directory", () => {
    fs.existsSync.mockReturnValueOnce(true)
    fs.readFileSync.mockReturnValueOnce("{\"gist\":\"abc123\",\"npm\":{\"eslint\":\"latest\"}}")

    expect(loadUserConfig("/tmp/shellfection-home")).toEqual({
      gist: "abc123",
      npm: {
        eslint: "latest",
      },
    })

    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/shellfection-home/.shellfection.json")
  })
})
