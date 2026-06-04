# Node tooling

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
