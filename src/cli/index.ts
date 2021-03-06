import { readFileSync } from 'fs'
import { resolve } from 'path'
import parseArgs from 'yargs-parser'
import { check } from './check'
import { DEFAULT_LOCALES } from './constants'
import { extract } from './extract'
import { purge } from './purge'
import { ExitCode } from './util/exit_code'
import { getFiles, isDirectory, isSourceCode } from './util/file'
import { wrap } from './wrap'
import assert = require('assert')

const args = parseArgs(process.argv.slice(2), {
  alias: {
    help: ['h'],
  },
  string: [''],
  boolean: [
    'write',
    'silent',
    'skip-wrap',
    'skip-extract',
    'skip-resource',
    'keep-unused',
  ],
})
const [command, ...restArgs] = args._
const isTTY = process.stdin.isTTY

const getFileList = (path: string | undefined): string[] | undefined => {
  if (path) {
    return getFiles(path, { exclude: args.exclude }).filter(isSourceCode)
  }
  return !isTTY
    ? readFileSync(0, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((f) => f.trim())
    : undefined
}

const handleWrap = async () => {
  const [path] = restArgs
  const files = getFileList(path)

  if (args.help || !files) {
    console.info(
      `a18n wrap <path> --write [<options>]

DESCRIPTION
  Modify code files from given <path>, wrap 'string_literal' and \`template\${string}\` with default translate function 'a18n("string_literal")' or 'a18n\`template\${string}\`'
  Stdin is read as file list if it is piped to a18n and no <path> is given.

OPTIONS:
  '<path>':
    file/dir/glob, code files to be processed. multiple entries are seperated by comma
  '--write':
    write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--namespace':
    a name that uniquely identifies current project, this helps avoid resource conflicting with other dependencies that also uses "a18n"
  '--exclude':
    directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
  '--silent':
    do not print files being processed (this will be ignored when '--write' is not present)

NOTE:
  only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
  use "// @a18n-ignore" to ignore next line, use "// @a18n-ignore-file" to ignore entire file
`,
    )
    return
  }
  if (!args.write && args.silent) {
    args.silent = false
  }
  await wrap(files, {
    write: args.write,
    exclude: args.exclude,
    namespace: args.namespace,
    silent: args.silent,
  })
}

const handleExtract = async () => {
  let [path /* optional */, localeRoot] = restArgs
  let files: string[] | undefined
  if (path && localeRoot) {
    files = getFileList(path)
  } else if (path) {
    localeRoot = path
    files = getFileList(undefined)
  }
  if (args.help || !files || !localeRoot) {
    console.info(
      `a18n extract <path> <localeRoot> [<options>]

DESCRIPTION
  Parse code files from given <path>, extract texts to be translated (which are wrapped in 'a18n()/a18n\`\`') to <localeRoot> directory.
  Stdin is read as file list if it is piped to a18n and no <path> is given.

OPTIONS:
  '<path>':
    file/dir/glob, code files to be processed. multiple entries are seperated by comma
  '<localeRoot'>:
    directory to store locale resource files
  '--locales':
    languages to be exported, separated by comma. example: 'da,de-AT,de-CH,de-DE'
  '--keep-unused':
    keep unused texts/translations even if they are not found in code being extracted.
  '--silent':
    do not print files being processed
`,
    )
    return
  }

  const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
  assert(
    isDirectory(absoluteLocaleRoot),
    `locale root is not a directory: ${localeRoot}`,
  )

  await extract(files, {
    localeRoot: absoluteLocaleRoot,
    locales: args.locales
      ? (args.locales as string)
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean)
      : DEFAULT_LOCALES,
    exclude: args.exclude,
    silent: args.silent,
    keepUnused: args['keep-unused'],
  })
}

const handlePurge = async () => {
  const [path] = restArgs
  const files = getFileList(path)
  if (args.help || !files) {
    console.info(
      `a18n purge <path> --write [<options>]

DESCRIPTION
  Modify code files from given <path>, remove 'a18n()/a18n\`\`' translation calls and import statements
  Stdin is read as file list if it is piped to a18n and no <path> is given.

OPTIONS:
  '<path>':
    file/dir/glob, code files to be processed. multiple entries are seperated by comma
  '--write':
    write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--exclude':
    directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
  '--silent':
    do not print files being processed (this will be ignored when '--write' is not present)

NOTE:
  Only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
`,
    )
    return
  }
  if (!args.write && args.silent) {
    console.warn(
      `'--silent=true' is ignored, it only take effect when '--write' is present.`,
    )
    args.silent = false
  }
  await purge(files, {
    write: args.write,
    exclude: args.exclude,
    namespace: args.namespace,
    silent: args.silent,
  })
}

const handleCheck = async () => {
  let [path /* optional */, localeRoot] = restArgs
  let files: string[] | undefined
  if (path && localeRoot) {
    files = getFileList(path)
  } else if (path) {
    localeRoot = path
    files = getFileList(undefined)
  }
  if (args.help || !files || !localeRoot) {
    console.info(
      `a18n check <path> <localeRoot> [<options>]

DESCRIPTION
  Analyze code files from given <path> and translated texts at <localeRoot>, check for untranslated texts.
  If any, print and exit with error code.
  Stdin is read as file list if it is piped to a18n and no <path> is given.

  These types of "missing translation" will be checked:
  - texts in code that are not wrapped as expected
  - texts in code that are not extracted to locale resources folder
  - texts in locale resources with no translation (keys with value = null),
  - any incorrect translation calls and syntax errors found in the process

OPTIONS:
  '<path>':
    file/dir/glob, code files to be processed. multiple entries are seperated by comma
  '<localeRoot'>:
    directory to store locale resource files
  '--locales=<localeRoot>':
    specify locales to check, by default all locale files under <localeRoot> are checked
  '--skip-wrap':
    do not check for unwrapped texts
  '--skip-extract':
    do not check for unextracted texts
  '--skip-resource':
    do not check for missing translation
  '--exclude':
    directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
`,
    )
    return
  }

  const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
  assert(
    isDirectory(absoluteLocaleRoot),
    `locale root is not a directory: ${localeRoot}`,
  )

  await check(files, {
    localeRoot: absoluteLocaleRoot,
    locales: args.locales
      ? (args.locales as string)
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean)
      : DEFAULT_LOCALES,
    skipWrap: args['skip-wrap'],
    skipExtract: args['skip-extract'],
    skipResource: args['skip-resource'],
    exclude: args.exclude,
    silent: true,
  })
}

const main = async () => {
  switch (command) {
    case 'wrap': {
      await handleWrap()
      break
    }
    case 'extract': {
      await handleExtract()
      break
    }
    case 'purge': {
      await handlePurge()
      break
    }
    case 'check': {
      await handleCheck()
      break
    }
    default:
      console.info('Supported commands: wrap, extract, check, purge')
      console.info('Run `a18n <command> --help` to see help for <command>')
      break
  }
}

main()
  .then(() => {
    process.exit(ExitCode.Success)
  })
  .catch((e) => {
    console.error(e)
    process.exit(ExitCode.Unknown)
  })
