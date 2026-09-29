# Publishing the forked npm package

The JavaScript package is `@francislavoie/tauri-playwright`, in `packages/test`.
The Rust plugin remains a Git dependency for launcher-e; this workflow does
not publish a crate.

## First release

The first version is `0.4.2`. Merge the publishing changes to the fork's
`main` branch first. npm requires an account that owns the `@francislavoie`
scope. On your own machine, pull the updated `main` branch, then run:

```sh
npm login
npm whoami                         # must print francislavoie
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @francislavoie/tauri-playwright test
cd packages/test
npm publish --access public
```

`prepack` builds `dist` before publication. npm may prompt for two-factor
authentication. Review the contents first with
`npm publish --dry-run --access public` if desired. The package is public so launcher-e CI can install it
without npm credentials.

## Later releases

In the published package's npm settings, add a **Trusted Publisher** for
GitHub Actions: user `francislavoie`, repository `tauri-playwright`, workflow
filename `release.yml`, and allow `npm publish`. Then bump
`packages/test/package.json` to a new version, refresh `pnpm-lock.yaml`, merge
that change to `main`, and run the **Publish npm package** workflow manually.
It uses npm's OIDC authentication and requires no long-lived npm token.

Every npm version is immutable. Do not reuse a published version number.
