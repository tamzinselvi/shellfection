# shellfection [![Travis](https://img.shields.io/travis/tomselvi/shellfection.svg)](https://travis-ci.org/tomselvi/shellfection)

Very Expiremental - use at your own risk!

A CLI tool managing configuration, packages & themer.

Comes preloaded with tmux, Vim, zsh & more.

Fully customizeable via configuration.

Package installation currently targets macOS Homebrew and Linux apt/yum.
Windows package-manager support is not implemented; the evaluated follow-up
direction is limited Chocolatey support for explicitly mapped packages. See
`docs/windows-package-manager-evaluation.md`.

## Installation & usage

Install this module wherever:

    npm install shellfection

### Development setup

This project uses npm only. Install dependencies from the tracked
`package-lock.json`:

    npm ci

Build and test on Node 22 or newer:

    npm run build
    npm test

Link the package bins locally and verify the globally linked commands:

    npm link
    shellfection --help
    shellfection-welcome

Install everything:

    shellfection install

On macOS, Homebrew packages are managed through the checked-in `Brewfile`.
Review it before running install, or run `shellfection install --skip-packages`
to skip only OS package manager work while still applying dotfile symlinks,
local config clones, oh-my-zsh setup, Vundle setup, themer generation, npm
packages, and pip packages.

Install flags:

- `--clean` replaces existing managed symlinks but leaves existing cloned local
  config files/directories in place.
- `--deep-clean` replaces both existing managed symlinks and cloned local config
  files/directories.
- `--force` overwrites existing managed symlinks and cloned local config
  files/directories; for config files it is equivalent to `--deep-clean` and is
  named for explicit overwrite intent.
- `--skip-packages` skips Homebrew Bundle on macOS and apt/yum plus casks on
  Linux; npm, pip, symlinks, local config, oh-my-zsh setup, Vundle setup, and
  themer still run.
- `--verbose` / `-v` disables install spinners and prints setup command lines
  plus child process output for managed external commands.

User config lives at `~/.shellfection.json`. The sample
`config/shellfection.json` shows the supported top-level keys and value types.

Shellfection manages the oh-my-zsh block in its shipped `.zshrc`; do not copy
that block into `~/.zshrc.local`. The setup command installs oh-my-zsh
unattended when `~/.oh-my-zsh` is missing and preserves shellfection's managed
`.zshrc`. The shipped theme is the stock `robbyrussell` theme so clean installs
do not reference a missing custom theme.

Shellfection also manages Vundle for its shipped Vim config. Setup clones
Vundle into `~/.vim/bundle/Vundle.vim`, matching the classic Vim runtime path
in the shipped `.vimrc`, and runs `vim` in ex/silent mode with `PluginInstall!`
and `qall!` only when `vim` is available. Git prompts are disabled and setup
commands have timeouts so stale plugin repos fail observably instead of hanging
behind a spinner. Vundle plugin-install failures warn and the rest of setup
continues. The shipped Vim files guard Vundle and the themer colorscheme so Vim
can still open before plugins or generated theme files exist.

### Default inventory notes

The `Brewfile` owns macOS Homebrew formulae. `config.json` still owns
dotfile links, local clones, npm packages, pip packages, themer output, and
Linux apt/yum package names.

The default Brewfile keeps media and compatibility tools that current
shellfection files still invoke: `cmatrix` and `mpv` for screensavers,
`reattach-to-user-namespace` for tmux on macOS, `the_silver_searcher` because
the Vim config still uses `ag`, and `pandoc` for markdown previews through
`lynx`. The stale `mpv --with-libcaca` option was replaced with plain `mpv`.

`fftw` and `ncurses` were removed from the macOS default inventory because no
current shellfection file uses them directly; install them separately if a
local extension needs them. Homebrew `python`, `Pillow`, and `drawille` were
also removed from the default inventory because the bundled terminal-image
Python helpers are Python 2-era scripts and the stale pip pins break current
Python installs.

Themer now installs the current single `themer` npm package and uses its
built-in `github-universe`, `tmux`, `vim`, `iterm`, `chrome`, `slack`, and
wallpaper template names. The old `themer-*` package list was removed, and the
legacy JetBrains template was not retained because current themer CLI metadata
does not list it as a built-in template. The generated Vim colorscheme is
linked to `~/.vim/colors/themer.vim` so the shipped
`colorscheme themer` setting can load it.
