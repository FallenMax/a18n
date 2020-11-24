import { resolve } from 'path'
import parseArgs from 'yargs-parser'
import { check } from './check'
import { DEFAULT_LOCALES } from './constants'
import { extract } from './extract'
import { purge } from './purge'
import { ExitCode } from './util/exit_code'
import { isValidPath } from './util/file'
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

const handleWrap = async () => {
  const [path] = restArgs
  if (args.help || !path) {
    console.info(
      `a18n wrap <path> --write [<options>]

DESCRIPTION
  Modify code files under <path>, wrap 'string_literal' and \`template\${string}\` with default translate function 'a18n("string_literal")' or 'a18n\`template\${string}\`'

OPTIONS:
  '<path>':
    required, code directory to be traversed
  '--write':
    optional, write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--namespace':
    optional, a name that uniquely identifies current project, this helps avoid resource conflicting with other dependencies that also uses "a18n"
  '--exclude':
    optional, directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
  '--silent':
    optional, do not print files being processed (this will be ignored when '--write' is not present)

NOTE:
  only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
  use "// @a18n-ignore" to ignore next line, use "// @a18n-ignore-file" to ignore entire file
`,
    )
    return
  }
  const absolutePath = resolve(process.cwd(), path)
  assert(isValidPath(absolutePath), `Invalid path: ${path}`)
  if (!args.write && args.silent) {
    console.warn(
      `'--silent=true' is ignored, it only take effect when '--write' is present.`,
    )
    args.silent = false
  }
  await wrap(path, {
    write: args.write,
    exclude: args.exclude,
    namespace: args.namespace,
    silent: args.silent,
  })
}

const handleExtract = async () => {
  const [path, localeRoot] = restArgs
  if (args.help || !path || !localeRoot) {
    console.info(
      `a18n extract <path> <localeRoot> [<options>]

DESCRIPTION
  Traverse code files under <path>, extract texts to be translated (which are wrapped in 'a18n()/a18n\`\`') to <localeRoot> directory.

OPTIONS:
  '<path>':
    required, code directory to be traversed
  '<localeRoot'>:
    required, directory to store locale resource files
  '--locales':
    optional, languages to be exported, separated by comma. example: 'da,de-AT,de-CH,de-DE'
  '--keep-unused':
    optional, keep unused texts/translations even if they are not found in code being extracted.
  '--silent':
    optional, do not print files being processed
`,
    )
    return
  }

  const absolutePath = resolve(process.cwd(), path)
  const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
  assert(isValidPath(absolutePath), `Invalid path: ${path}`)
  assert(isValidPath(absoluteLocaleRoot), `Invalid path: ${localeRoot}`)

  await extract(path, {
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
  if (args.help || !path) {
    console.info(
      `a18n purge <path> --write [<options>]

DESCRIPTION
  This command will traverse code files in <path> directory, remove 'a18n()/a18n\`\`' translation calls and import statements

OPTIONS:
  '<path>':
    required, code directory to be traversed
  '--write':
    optional, write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--exclude':
    optional, directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
  '--silent':
    optional, do not print files being processed (this will be ignored when '--write' is not present)

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
  const absolutePath = resolve(process.cwd(), path)
  assert(isValidPath(absolutePath), `Invalid path: ${path}`)
  await purge(path, {
    write: args.write,
    exclude: args.exclude,
    namespace: args.namespace,
    silent: args.silent,
  })
}

const handleCheck = async () => {
  const [path, localeRoot] = restArgs
  if (args.help || !path || !localeRoot) {
    console.info(
      `a18n check <path> <localeRoot> [<options>]

DESCRIPTION
  Check for untranslated texts. If any, print and exit with error code.

  These types of "missing translation" will be checked:
  - texts in code that are not wrapped as expected
  - texts in code that are not extracted to locale resources folder
  - texts in locale resources with no translation (keys with value = null),
  - any incorrect translation calls and syntax errors found in the process

OPTIONS:
  '<path>': required, code directory to be traversed
  '<localeRoot'>: required, directory to store locale resource files
  '--locales=<localeRoot>': specify locales to check, by default all locale files under <localeRoot> are checked
  '--skip-wrap': do not check for unwrapped texts
  '--skip-extract': do not check for unextracted texts
  '--skip-resource': do not check for missing translation
  '--exclude':
    optional, directories and files to be ignored, multiple glob rules are separated by comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
`,
    )
    return
  }

  const absolutePath = resolve(process.cwd(), path)
  const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
  assert(isValidPath(absolutePath), 'invalid path')
  assert(isValidPath(absoluteLocaleRoot), `Invalid path: ${localeRoot}`)

  await check(path, {
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
