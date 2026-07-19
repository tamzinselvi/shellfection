# Windows Package Manager Evaluation

## Recommendation

Proceed with Windows package support only as a separate, narrow Chocolatey
implementation ticket. Do not include it in the macOS Homebrew setup refresh.

Windows belongs in shellfection's near-term scope only if this project is
expected to bootstrap a cross-platform terminal environment. The current code is
already organized around package-manager-specific identifiers on a shared
package record, and Chocolatey is the smallest Windows addition to that model.
Full workstation bootstrap, native app management, or multiple Windows package
managers should remain out of scope until Windows is confirmed as a primary
target environment.

## Practical Comparison

| Manager | Fit for shellfection | Main implementation concerns |
| --- | --- | --- |
| Chocolatey | Best near-term fit. The command shape is close to the existing apt/yum install paths: `choco install <pkg> -y`, with installed-package checks available through `choco list` options. It supports simple package identifiers that can sit beside existing `brew`, `apt`, and `yum` fields. | Requires Chocolatey to be installed before shellfection runs, may require administrator privileges for some packages, and needs an explicit package-name review instead of copying the macOS inventory. |
| winget | Good Windows-native option for many user applications. Official docs support exact package IDs, installed-package listing, silent installs, and agreement flags such as `--accept-package-agreements` and `--accept-source-agreements`. | More behavior has to be encoded: exact ID matching, source agreements, installer agreements, user vs machine scope, Microsoft Store/App Installer availability, and PATH/elevation differences. This is a larger platform model than the current CLI needs. |
| Scoop | Good developer-tool experience with user-space installs and shims. It can install CLI packages with `scoop install <app>` and uses buckets for package manifests. | Scoop's bucket model, per-user install location, and optional global install mode are a different setup contract from Homebrew/apt/yum. Adding Scoop cleanly would need schema for buckets and scope, not just package IDs. |

## Config Schema Direction

Add a `choco` field to selected entries under `packages` rather than adding a
generic Windows package-manager section now.

Example follow-up mappings:

```json
{
  "packages": {
    "wget": {
      "brew": "wget",
      "apt": "wget",
      "yum": "wget",
      "choco": "wget"
    },
    "neovim": {
      "brew": "neovim",
      "apt": "neovim",
      "yum": "neovim",
      "choco": "neovim"
    }
  }
}
```

Keep the initial mapping list intentionally small. Representative terminal tools
are enough to validate routing, command generation, and package-name review
without promising parity with the macOS inventory.

## Minimum Code Scope

- `src/util.js`: add `OSType.WindowsChoco`.
- `src/util.js`: update OS detection so `os.platform() === "win32"` checks for
  `choco` and returns `WindowsChoco` when available.
- `src/util.js`: add command builders such as `chocoList(pkg)` and
  `chocoInstall(pkg)`.
- `src/util.js`: route `installPackage(OSType.WindowsChoco, pkg)` to a
  Chocolatey installer that skips packages without `pkg.choco`.
- `config.json`: add one or two reviewed `choco` package identifiers.
- `README.md`: document that Windows support requires preinstalled Chocolatey
  and is intentionally limited to packages with explicit `choco` mappings.

## Command And Test Seam

Windows behavior should be testable off Windows by injecting or wrapping the
three host-dependent operations instead of invoking them directly:

- platform lookup, currently `os.platform()`
- command presence checks, currently `command-exists`
- command execution, currently `child_process.exec`

A small dependency object is enough:

```js
const defaultHost = {
  platform: () => os.platform(),
  commandExists,
  exec,
}
```

Then `getOSType(host = defaultHost)` and installer helpers can be unit tested
with fake `platform`, `commandExists`, and `exec` functions. Existing
`getInstallCommands` tests can cover command shape without executing package
manager commands:

```js
expect(getInstallCommands.chocoList("neovim")).toBe("choco list --local-only --exact neovim")
expect(getInstallCommands.chocoInstall("neovim")).toBe("choco install neovim -y")
```

No Windows package-manager command should run in tests.

## Follow-Up Implementation Ticket

Title: Add narrow Chocolatey package support

Problem / Symptom:

Shellfection can install configured packages on macOS Homebrew and Linux
apt/yum, but Windows currently falls through to `OSType.Unknown`. The Windows
package-manager evaluation recommends Chocolatey as the narrowest near-term
integration if Windows terminal setup is a real target environment.

Requirements:

1. Add a Windows Chocolatey OS type detected from `os.platform() === "win32"`
   only when `choco` exists.
2. Add Chocolatey command builders for installed-package checks and installs.
3. Route package installation for the Windows Chocolatey OS type and skip
   packages without a `choco` identifier.
4. Add explicit `choco` mappings for one or two reviewed representative
   packages only.
5. Add an injectable host command seam so Windows detection and install command
   behavior can be tested on non-Windows development machines.
6. Document the limited Windows support and the preinstalled-Chocolatey
   assumption.

Acceptance:

1. Unit tests cover Windows detection, Chocolatey command generation, skip
   behavior for packages without `choco`, and install routing without executing
   real package-manager commands.
2. Existing macOS and Linux command behavior is unchanged.
3. README guidance makes clear that Chocolatey support is limited and is not a
   full Windows workstation bootstrap.

## Sources Checked

- Chocolatey install command documentation:
  https://docs.chocolatey.org/en-us/choco/commands/install
- Microsoft winget install command documentation:
  https://learn.microsoft.com/en-us/windows/package-manager/winget/install
- Microsoft winget list command documentation:
  https://learn.microsoft.com/en-us/windows/package-manager/winget/list
- Scoop buckets documentation:
  https://github.com/ScoopInstaller/Scoop/wiki/Buckets
- Scoop installer documentation:
  https://github.com/ScoopInstaller/Install
