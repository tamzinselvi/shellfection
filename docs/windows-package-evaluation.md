# Windows package manager evaluation

Reviewed on 2026-06-03 for `SHELLFECTION-SETUP-3`.

## Recommendation

Add Windows package support only as a separate near-term follow-up, not as part
of the macOS Brewfile refresh. If shellfection is expected to support Windows
terminal setup, the narrowest first implementation is Chocolatey.

This recommendation keeps the current platform model intact for the Brewfile
work while giving Windows a small explicit path:

- add an `OSType` value for Windows when `os.platform()` is `win32` and `choco`
  is available;
- route packages with a `choco` identifier to a Chocolatey installer;
- add one or two representative package mappings to `config.json` instead of
  mirroring the full macOS package list;
- leave `winget` and Scoop out until there is a clearer Windows workstation
  bootstrap goal.

## Practical comparison

| Manager | Fit for shellfection | Command shape | Planning concerns |
| --- | --- | --- | --- |
| Chocolatey | Best first fit. Its CLI is closest to the existing brew/apt/yum flow and supports noninteractive install commands. | Official docs show `choco install <pkg|packages.config> [<pkg2> <pkgN>] [<options/switches>]`; `-y`, `--yes`, and `--confirm` answer prompts affirmatively. | Requires Chocolatey to be installed before shellfection runs. Some packages need admin privileges or package-specific parameters, so bootstrap and package-id review must stay explicit. |
| winget | Useful Windows-native package manager, but not the first shellfection integration. | Microsoft docs show `winget install <appname>` and `winget list` for installed packages. | App Installer/PATH availability can vary; installer/source behavior, agreements, and app identifiers are a different model than the existing package-map fields. |
| Scoop | Good developer-tool manager, but a larger model change for shellfection. | Scoop docs show `scoop install curl` and list `install`/`list` among built-in commands. | Default user-space installs under the user profile and bucket management are materially different from Homebrew formulas/casks or system package managers. |

Sources:

- Chocolatey install command: https://docs.chocolatey.org/en-us/choco/commands/install/
- WinGet command overview: https://learn.microsoft.com/en-us/windows/package-manager/winget/
- Scoop overview and commands: https://scoop.sh/ and https://github.com/ScoopInstaller/Scoop/wiki/Commands

## Config schema

Use a package-level `choco` field for the first Windows implementation:

```json
{
  "packages": {
    "git": {
      "brew": "git",
      "apt": "git",
      "yum": "git",
      "choco": "git"
    }
  }
}
```

This matches the existing `brew`/`apt`/`yum` package identifiers in
`config.json` and avoids introducing a broad Windows package-manager section
before shellfection has multiple Windows managers to support.

A generic schema such as `windows: { manager, package }` or
`packages.<id>.windows.choco` should wait until there is an accepted need to
support multiple Windows package managers in the same config.

## Command and test seam

Windows behavior should be testable off Windows by separating command generation
and command execution from OS detection:

- keep command strings in `getInstallCommands`, adding `chocoList(pkg)` and
  `chocoInstall(pkg)` command builders;
- inject or wrap `os.platform`, command-existence checks, and `exec` so unit
  tests can simulate `win32`, `choco` presence, installed-package checks, and
  install failures without running Windows or Chocolatey;
- add focused tests for `getOSType` Windows detection, `installPackage`
  routing, and Chocolatey command generation.

The minimum command sketch is:

```js
chocoList: (pkg) => `choco list --local-only --exact ${pkg}`,
chocoInstall: (pkg) => `choco install -y ${pkg}`,
```

No install commands should run as part of this evaluation.

## Follow-up implementation ticket

Title: Add narrow Chocolatey package support

Problem:

shellfection currently recognizes only Darwin, apt-based Linux, yum-based
Linux, and Unknown OS types. Windows falls through to Unknown, so Windows users
cannot install configured packages even when Chocolatey is available.

Requirements:

1. Add a Windows Chocolatey OS type that is selected when `os.platform()` is
   `win32` and `choco` exists.
2. Add Chocolatey command builders for installed-package checks and
   noninteractive package installation.
3. Route `installPackage` to Chocolatey only for packages with a `choco` field.
4. Add one or two representative `choco` package identifiers to `config.json`.
5. Add an injectable command/test seam so Windows detection and Chocolatey
   install behavior are covered by unit tests on non-Windows CI.
6. Update README platform guidance to describe Windows Chocolatey support and
   the prerequisite that Chocolatey must already be installed.

Acceptance:

1. Unit tests cover Windows OS detection, Chocolatey command generation, and
   install routing without requiring Windows or running `choco`.
2. Existing Darwin, apt, and yum package behavior remains unchanged.
3. `npm test` passes.
