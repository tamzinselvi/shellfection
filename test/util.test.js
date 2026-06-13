jest.mock("child_process", () => ({
  exec: jest.fn(),
}))

import { exec } from "child_process"
import {
  getInstallCommands,
  installHomebrewBundle,
  InstallStatus,
  OSType,
  series,
} from "../src/util"

beforeEach(() => {
  jest.clearAllMocks()
})

describe("getInstallCommands", () => {
  test("builds the existing package manager commands", () => {
    expect(getInstallCommands.brewBundleCheck("Brewfile")).toBe("brew bundle check --file Brewfile")
    expect(getInstallCommands.brewBundleDump("Brewfile")).toBe("brew bundle dump --file Brewfile --force")
    expect(getInstallCommands.brewBundleInstall("Brewfile")).toBe("brew bundle install --file Brewfile")
    expect(getInstallCommands.aptInstall("git")).toBe("apt-get install -y git")
    expect(getInstallCommands.yumInstall("git")).toBe("yum install -y git")
    expect(getInstallCommands.pipInstall("Pillow==5.0.0")).toBe("pip install Pillow==5.0.0")
    expect(getInstallCommands.npmGlobalInstall("themer@2.0.0")).toBe("npm install -g themer@2.0.0")
  })
})

describe("installHomebrewBundle", () => {
  test("uses Homebrew Bundle install when bundle check reports missing items", async () => {
    exec
      .mockImplementationOnce((cmd, callback) => callback(new Error("missing")))
      .mockImplementationOnce((cmd, callback) => callback())

    const result = await installHomebrewBundle(OSType.Darwin, "Brewfile")

    expect(exec).toHaveBeenNthCalledWith(1, "brew bundle check --file Brewfile", expect.any(Function))
    expect(exec).toHaveBeenNthCalledWith(2, "brew bundle install --file Brewfile", expect.any(Function))
    expect(result).toBe(InstallStatus.Installed)
  })

  test("skips Bundle install when bundle check passes", async () => {
    exec.mockImplementationOnce((cmd, callback) => callback())

    const result = await installHomebrewBundle(OSType.Darwin, "Brewfile")

    expect(exec).toHaveBeenCalledTimes(1)
    expect(exec).toHaveBeenCalledWith("brew bundle check --file Brewfile", expect.any(Function))
    expect(result).toBe(InstallStatus.NoChanges)
  })

  test("does not run Homebrew Bundle on non-Darwin operating systems", async () => {
    const result = await installHomebrewBundle(OSType.LinuxApt, "Brewfile")

    expect(exec).not.toHaveBeenCalled()
    expect(result).toBe(InstallStatus.NoChanges)
  })
})

describe("series", () => {
  test("runs promise factories in order", async () => {
    const calls = []

    const results = await series([
      () => Promise.resolve("first").then((result) => {
        calls.push(result)
        return result
      }),
      () => Promise.resolve("second").then((result) => {
        calls.push(result)
        return result
      }),
    ])

    expect(calls).toEqual(["first", "second"])
    expect(results).toEqual(["first", "second"])
  })
})
