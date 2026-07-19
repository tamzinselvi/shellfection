# shellfection [![Travis](https://img.shields.io/travis/tomselvi/shellfection.svg)](https://travis-ci.org/tomselvi/shellfection)

Very Expiremental - use at your own risk!

A CLI tool managing configuration, packages & themer.

Comes preloaded with tmux, neovim, zsh & more.

Fully customizeable via configuration.

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
