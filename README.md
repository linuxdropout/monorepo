# Monorepo base

Repo to serve as the starting point for a typescript/yarn monorepo.

Opinionated, but with overrides for as many things as is sensible.

## Quickstart

Q: I just opened this in vscode, why is everything empty?
  > Boilerplate is noise, so it's hidden by default. You can view the files with `CTRL + o`
  > You can change this setting in [.vscode/settings.json](.vscode/settings.json)

To get started you'll want to start with `yarn cli` which is the designated tool for managing boilerplate.

Try `yarn cli package utils` for a quick example.

## Scripts

```sh
yarn cli
```
The tool to manage your boilerplate

```sh
yarn test
```
Run all your `test` scripts. Equivalent to `yarn workspaces foreach -vp run test`

```sh
yarn lint
```
Run all your `lint` scripts. Equivalent to `yarn workspaces foreach -vp run test`
