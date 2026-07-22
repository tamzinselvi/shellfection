# Homebrew-managed shellfection defaults.
#
# This file is the macOS package source of truth. Keep Linux apt/yum,
# npm, pip, symlinks, clones, and themer configuration in config.json.

# Core shell tooling.
brew "wget"
brew "tmux"
brew "tig"
brew "lynx"

# shellfection installs zsh config and prefers Homebrew zsh over macOS' bundled shell.
brew "zsh"

# Kept for current shellfection integrations:
# - tmux.conf still uses reattach-to-user-namespace for macOS tmux sessions.
# - screensaver helpers invoke cmatrix and mpv; mpv no longer supports --with-libcaca.
# - vimrc still configures ag, so the_silver_searcher remains for compatibility.
# - aliasrc uses pandoc for markdown previews through lynx.
brew "reattach-to-user-namespace"
brew "cmatrix"
brew "mpv"
brew "the_silver_searcher"
brew "pandoc"

# Demoted from the macOS default inventory:
# - fftw: numerical library with no direct shellfection consumer.
# - ncurses: keg-only on macOS and supplied by the system unless explicitly needed.
# - python: current Homebrew Python does not match the Python 2-era bundled scripts;
#   keep pip packages in JSON until that toolchain is ported deliberately.
