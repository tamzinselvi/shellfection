jest.mock("child_process", () => ({
  exec: jest.fn(),
}))

import { exec } from "child_process"
import fs from "fs"
import path from "path"
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
    expect(getInstallCommands.pipInstall("sample-pkg==1.0.0")).toBe("pip install sample-pkg==1.0.0")
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

describe("shipped shell config", () => {
  test("guards optional welcome binary before invoking it", () => {
    const zshrc = fs.readFileSync(path.resolve(__dirname, "../config/zshrc")).toString()

    expect(zshrc).toContain("command -v shellfection-welcome >/dev/null 2>&1")
  })

  test("guards managed oh-my-zsh source without overwriting PATH", () => {
    const zshrc = fs.readFileSync(path.resolve(__dirname, "../config/zshrc")).toString()

    expect(zshrc).toContain("export ZSH=\"$HOME/.oh-my-zsh\"")
    expect(zshrc).toContain("ZSH_THEME=\"robbyrussell\"")
    expect(zshrc).toContain("plugins=(git)")
    expect(zshrc).toContain("[ -f \"$ZSH/oh-my-zsh.sh\" ] && source \"$ZSH/oh-my-zsh.sh\"")
    expect(zshrc).not.toContain("export PATH=\"/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin\"")
  })

  test("guards Vundle startup and themer colorscheme", () => {
    const vimrc = fs.readFileSync(path.resolve(__dirname, "../config/vimrc")).toString()
    const vimrcLocal = fs.readFileSync(path.resolve(__dirname, "../config/vimrc.local")).toString()

    expect(vimrc).toContain("if isdirectory(expand('~/.vim/bundle/Vundle.vim'))")
    expect(vimrc).toContain("set rtp+=~/.vim/bundle/Vundle.vim")
    expect(vimrc).toContain("call vundle#begin()")
    expect(vimrc).toContain("call vundle#end()")
    expect(vimrc).toContain("if filereadable(expand(\"~/.vimrc.bundles.local\"))")
    expect(vimrcLocal).toContain("silent! colorscheme themer")
  })
})
