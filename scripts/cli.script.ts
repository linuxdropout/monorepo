/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import yargs from 'yargs'
import fs from 'fs'
import path from 'path'

// process.env global variables (can be overridden with process.env.VARIABLE_NAME)
export const DEFAULT_WORKSPACE = 'packages'
export const TEMPLATE_PATH = path.resolve(__dirname, '../templates')
export const ROOT_PATH = path.resolve(__dirname, '..')
export const ROOT_ESLINT_PATH = path.resolve(__dirname, '../.eslintrc.js')

// other global variables
export const REQUIRED_PACKAGE_NAMES = new Set([
  'typescript',
  'eslint',
])
export const REQUIRED_PACKAGE_PREFIXES = [
  'eslint-config-',
  'eslint-plugin-',
  '@typescript-eslint/',
]

declare type PackageJson = {
  name?: string
  workspaces?: string[]
  devDependencies?: {
    [key: string]: string
  }
  dependencies?: {
    [key: string]: string
  }
  scripts?: {
    [key: string]: string
  }
}

function getDefault(
  options: string[],
  envKey?: string,
  defaults?: string[],
): string | undefined {
  const optSet = new Set(options)

  const envVal = envKey && process.env[envKey]
  if (envVal && optSet.has(envVal)) {
    return envVal
  }

  if (defaults?.length) {
    for (const def of defaults) {
      if (optSet.has(def)) return def
    }
  }

  return undefined
}

function getWorkspaces(workspacePrefixes: string[], rootPath: string) {
  const actualWorkspaces: string[] = []

  for (const prefix of workspacePrefixes) {
    const workspacePath = prefix.split('/').map(v => v.replace(/\*/gi, '')).filter(v => v).join('/')
    const filePath = path.resolve(rootPath, workspacePath)
    if (!fs.existsSync(filePath)) continue
    const stat = fs.lstatSync(filePath)
    if (!stat.isDirectory()) continue

    actualWorkspaces.push(workspacePath)
  }

  return {
    workspaces: actualWorkspaces,
    defaultWorkspace: getDefault(actualWorkspaces, 'DEFAULT_WORKSPACE', [DEFAULT_WORKSPACE]),
  }
}

export declare type CreateWorkspaceOpts = {
  name: string
}
export function ensureWorkspaceExists(
  opts: CreateWorkspaceOpts,
  rootPath: string,
) {
  const rootPackageJsonPath = path.resolve(rootPath, 'package.json')
  const root = require(rootPackageJsonPath) as PackageJson

  const workspacePrefix = `${opts.name}/*`
  const workspacePath = path.resolve(rootPath, opts.name)
  if (fs.existsSync(workspacePath)) {
    const stats = fs.lstatSync(workspacePath)
    if (!stats.isDirectory()) {
      throw new Error(`Unable to create workspace ${opts.name}, path: ${workspacePath} already exists but is not a directory`)
    }
    console.log(`workspace directory already exists at ${workspacePath}`)
  } else {
    console.log(`creating workspace directory at ${workspacePath}`)
    fs.mkdirSync(workspacePath)
  }

  const existingWorkspaces = new Set(root.workspaces)
  if (!existingWorkspaces.has(workspacePrefix)) {
    console.log(`adding workspace prefix ${workspacePrefix} to package json at ${rootPackageJsonPath}`)
    Object.assign(
      root,
      {
        workspaces: [
          ...(root.workspaces || []),
          workspacePrefix,
        ],
      },
    )
    fs.writeFileSync(rootPackageJsonPath, `${JSON.stringify(root, null, 2)}\n`)
  } else {
    console.log(`workspace already exists in package json at ${rootPackageJsonPath}`)
  }
}

export declare type CreatePackageOpts = {
  name: string
  template?: string | undefined
  workspace: string
}
export function createPackage(opts: CreatePackageOpts, rootPath: string) {
  const templatesPath = process.env.TEMPLATE_PATH || TEMPLATE_PATH
  const rootPackageJsonPath = path.resolve(rootPath, 'package.json')
  const rootJson = require(rootPackageJsonPath) as PackageJson
  const workspacePath = path.resolve(rootPath, opts.workspace)
  const packagePath = path.resolve(workspacePath, opts.name)
  if (fs.existsSync(packagePath)) {
    throw new Error(`Package already exists at ${packagePath}`)
  }
  ensureWorkspaceExists({ name: opts.workspace }, rootPath)

  if (opts.template) {
    const templatePath = path.resolve(templatesPath, opts.template)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template does not exist at ${templatePath}`)
    }
    if (!fs.lstatSync(templatePath).isDirectory()) {
      throw new Error(`Template at ${templatePath} is not a directory`)
    }
    console.log(`creating package from template at ${templatePath} to ${packagePath}`)
    fs.cpSync(templatePath, packagePath, { recursive: true, errorOnExist: true })
  } else {
    console.log(`creating package at ${packagePath}`)
    fs.mkdirSync(packagePath)
  }

  const packageJsonPath = path.resolve(packagePath, 'package.json')
  const packageJson: PackageJson = fs.existsSync(packageJsonPath) ? require(packageJsonPath) : {}

  if (!packageJson.name) {
    const rootNameParts = rootJson.name?.split('/')
    if (rootNameParts?.length !== 2) {
      throw new Error(`Root package json does not have a prefixed name,\n  got: ${rootJson.name}\n  expected: @*/*`)
    }
    const namePrefix = rootJson.name?.split('/').shift()
    packageJson.name = `${namePrefix}/${opts.name}`
  }

  const rootDependencies = [
    ...Object.keys(rootJson.dependencies || {}),
    ...Object.keys(rootJson.devDependencies || {}),
  ]
  const rootDepsToCopy = new Set<string>()
  DepLoop: for (const dep of rootDependencies) {
    if (REQUIRED_PACKAGE_NAMES.has(dep)) {
      rootDepsToCopy.add(dep)
      continue
    }

    for (const prefix of REQUIRED_PACKAGE_PREFIXES) {
      if (dep.startsWith(prefix)) {
        rootDepsToCopy.add(dep)
        continue DepLoop
      }
    }
  }

  if (rootDepsToCopy.size) {
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {}
    }
    for (const dep of rootDepsToCopy) {
      if (
        (packageJson.devDependencies && packageJson.devDependencies[dep])
        || (packageJson.dependencies && packageJson.dependencies[dep])
      ) {
        continue
      }
      packageJson.devDependencies[dep] = (
        (rootJson.devDependencies && rootJson.devDependencies[dep])
        || (rootJson.dependencies && rootJson.dependencies[dep])
      ) as string
    }
  }

  const eslintPath = path.resolve(packagePath, '.eslintrc.js')
  if (!fs.existsSync(eslintPath)) {
    const rootEslintPath = process.env.ROOT_ESLINT_PATH || ROOT_ESLINT_PATH
    if (rootEslintPath) {
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }
      if (!packageJson.scripts.lint) packageJson.scripts.lint = 'yarn eslint . --ext=ts,tsx'
      if (!packageJson.scripts['lint:fix']) packageJson.scripts['lint:fix'] = 'yarn eslint . --ext=ts,tsx --fix'
      const relativePath = path.relative(packagePath, rootEslintPath).split('.').slice(0, -1).join('.')
      fs.writeFileSync(
        eslintPath,
        `const baseConfig = require('${relativePath}')

module.exports = { ...baseConfig }
`,
      )
    }
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

export declare type SetNamespaceOpts = {
  name: string
}
export function setNamespace(opts: SetNamespaceOpts, rootPath: string) {
  if (!opts.name) {
    throw new Error('name is required')
  }

  const rootPackageJsonPath = path.resolve(rootPath, 'package.json')
  const rootJson = require(rootPackageJsonPath) as PackageJson

  const existingPrefix = rootJson.name?.split('/').shift()
  if (!existingPrefix?.startsWith('@')) {
    throw new Error(`Expected existing prefix to match @*/*, instead found ${rootJson.name}`)
  }

  if (rootJson.workspaces?.length) {
    for (const workspacePrefix of rootJson.workspaces) {
      const workspacePath = workspacePrefix.split('/').map(v => v.replace(/\*/gi, '')).filter(v => v).join('/')
      const dirPath = path.resolve(rootPath, workspacePath)
      if (!fs.existsSync(dirPath)) continue
      const stat = fs.lstatSync(dirPath)
      if (!stat.isDirectory()) continue

      const packages = fs.readdirSync(dirPath)
      for (const packageName of packages) {
        const packageJsonPath = path.resolve(dirPath, packageName, 'package.json')
        if (!fs.existsSync(packageJsonPath)) continue
        const packageJson = require(packageJsonPath) as PackageJson
        if (packageJson.name?.startsWith(existingPrefix)) {
          packageJson.name = `@${opts.name}${packageJson.name.slice(0, existingPrefix.length)}`
        }
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
      }
    }
  }

  rootJson.name = `@${opts.name}${rootJson?.name?.slice(existingPrefix.length)}`
  fs.writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootJson, null, 2)}\n`)
}

function main(...args: string[]) {
  const templatePath = process.env.TEMPLATE_PATH || TEMPLATE_PATH
  const templates = fs.existsSync(templatePath) ? fs.readdirSync(templatePath) : []
  const rootPath = process.env.ROOT_PATH || ROOT_PATH
  const root = require(path.resolve(rootPath, 'package.json')) as PackageJson
  const { workspaces, defaultWorkspace } = getWorkspaces(root.workspaces || [], rootPath)
  if (!workspaces.find(w => w === 'packages')) {
    workspaces.push('packages')
  }

  yargs(args)
    .scriptName('yarn cli')
    .command(
      ['namespace <name>', 'n <name>'],
      'set top level namespace',
      config => config
        .positional('name', {
          desc: 'namespace (aka: @namespace/...)',
          type: 'string',
        })
        .demandOption('name'),
      argv => setNamespace(argv, rootPath),
    )
    .command(
      ['workspace <name>', 'w <name>'],
      'create a new workspace',
      config => config
        .positional('name', {
          desc: 'workspace name',
          type: 'string',
        })
        .demandOption('name'),
      argv => ensureWorkspaceExists(argv, rootPath),
    )
    .command(
      ['package <name>', 'p'],
      'create a new package',
      config => {
        const res = config
          .positional('name', {
            desc: 'package name',
            type: 'string',
          })
          .options({
            template: {
              alias: 't',
              choices: templates.length ? templates : undefined,
              type: 'string',
            },
            workspace: {
              alias: 'w',
              choices: workspaces.length ? workspaces : ['packages'],
              default: defaultWorkspace || 'packages',
            },
          })
          .demandOption('name')
          .demandOption('workspace')

        return res
      },
      argv => createPackage(argv, rootPath),
    )
    .demandCommand()
    .recommendCommands()
    .completion()
    .parse()
}

if (require.main === module) {
  main(...process.argv.slice(2))
}

export default main
