import path from "path"
import { spawnSync } from "child_process"

const rootDir = path.join(__dirname, "..")

describe("package bins", () => {
  test("shellfection-welcome runs through the built lib entrypoint", () => {
    const result = spawnSync("node", ["bin/shellfection-welcome"], {
      cwd: rootDir,
      encoding: "utf8",
    })

    expect(result.stderr).toContain("shellfection-welcome:")
    expect(result.stderr).not.toContain("Error:")
    expect(result.stderr).not.toContain("at ")
  })

  test("linked bin wrappers report stale build output clearly", () => {
    const result = spawnSync("node", ["-e", "require('./bin/require-built-lib')('__missing__')"], {
      cwd: rootDir,
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("compiled lib/__missing__.js is missing")
    expect(result.stderr).not.toContain("MODULE_NOT_FOUND")
  })
})
