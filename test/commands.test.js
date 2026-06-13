jest.mock("fs", () => {
  const actual = jest.requireActual("fs")

  return {
    ...actual,
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    symlinkSync: jest.fn(),
    unlinkSync: jest.fn(),
  }
})

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, callback) => callback(null)),
}))

jest.mock("sharp", () => jest.fn(() => ({
  png: jest.fn(() => ({
    toFile: jest.fn(() => Promise.resolve()),
  })),
})))

jest.mock("../src/util", () => ({
  series: jest.fn((tasks) => tasks.reduce(
    (promise, task) => promise.then((results) => task().then((result) => results.concat(result))),
    Promise.resolve([]),
  )),
  installNpm: jest.fn(() => Promise.resolve()),
  installPip: jest.fn(() => Promise.resolve()),
}))

import fs from "fs"
import * as util from "../src/util"
import { exec } from "child_process"
import { installNpm, installPip, installThemer } from "../src/commands"

const spinner = {
  setSpinnerTitle: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("install orchestration", () => {
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
