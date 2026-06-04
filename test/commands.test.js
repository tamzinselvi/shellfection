jest.mock("../src/util", () => ({
  series: jest.fn((tasks) => tasks.reduce(
    (promise, task) => promise.then((results) => task().then((result) => results.concat(result))),
    Promise.resolve([]),
  )),
  installNpm: jest.fn(() => Promise.resolve()),
  installPip: jest.fn(() => Promise.resolve()),
}))

import * as util from "../src/util"
import { installNpm, installPip } from "../src/commands"

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

    expect(util.installNpm).toHaveBeenCalledWith("themer-colors-github-universe@latest")
    expect(util.installNpm).toHaveBeenCalledWith("themer-tmux@latest")
    expect(util.series).toHaveBeenCalledTimes(1)
    expect(spinner.stop).toHaveBeenCalledWith(true)
  })

  test("installs only enabled pip packages with pinned versions", async () => {
    await installPip({}, spinner)

    expect(util.installPip).toHaveBeenCalledWith("Pillow==5.0.0")
    expect(util.installPip).toHaveBeenCalledWith("drawille==0.1.0")
    expect(util.series).toHaveBeenCalledTimes(1)
    expect(spinner.stop).toHaveBeenCalledWith(true)
  })
})
