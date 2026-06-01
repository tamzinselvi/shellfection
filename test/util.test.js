import { getInstallCommands, series } from "../src/util"

describe("getInstallCommands", () => {
  test("builds the existing package manager commands", () => {
    expect(getInstallCommands.brewList("git")).toBe("brew list git &>/dev/null")
    expect(getInstallCommands.brewInstall("git")).toBe("brew install -y git")
    expect(getInstallCommands.brewCaskList("firefox")).toBe("brew cask list firefox &>/dev/null")
    expect(getInstallCommands.brewCaskInstall("firefox")).toBe("brew cask install -y firefox")
    expect(getInstallCommands.aptInstall("git")).toBe("apt-get install -y git")
    expect(getInstallCommands.yumInstall("git")).toBe("yum install -y git")
    expect(getInstallCommands.pipInstall("Pillow==5.0.0")).toBe("pip install Pillow==5.0.0")
    expect(getInstallCommands.npmGlobalInstall("themer@2.0.0")).toBe("npm install -g themer@2.0.0")
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
