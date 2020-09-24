import { resolve } from 'path'
import parseArgs from 'yargs-parser'
import { DEFAULT_LOCALES } from './constants'
import { extract } from './extract'
import { purge } from './purge'
import { isValidPath } from './util/file'
import { wrap } from './wrap'
import assert = require('assert')

const args = parseArgs(process.argv.slice(2), {
  alias: {
    write: ['w'],
    help: ['h'],
  },
  boolean: ['write', 'silent'],
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
  '<path>'：required，code directory to be traversed
  '--write'：
    optional, write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--namespace'：
    optional, a name that uniquely identifies current project, this helps avoid resource conflicting with other dependencies that also uses "a18n"
  '--exclude'：
    optional, directories and files to be ignored, multiple glob rules are separated by ',', e.g.: '. /dir/**.spec.js,. /anotherdir/**/*. *'
  '--silent'：
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
  assert(isValidPath(absolutePath), 'Invalid path')
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
  '<path>'：required，code directory to be traversed
  '<localeRoot'>: required, directory to store locale resource files
  '--locales': optional, languages to be exported, separated by comma. example: 'da,de-AT,de-CH,de-DE'
  '--silent'：
    optional, do not print files being processed
`,
    )
    return
  }

  const absolutePath = resolve(process.cwd(), path)
  const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
  assert(isValidPath(absolutePath), 'invalid path')

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
  })
}

const handlePurge = async () => {
  const [path] = restArgs
  if (args.help || !path) {
    console.info(
      `a18n purge <path> --write [<options>]

DESCRIPTION
  this command will traverse code files in <path> directory, remove 'a18n()/a18n\`\`' translation calls and import statements

OPTIONS:
  '<path>'：required，code directory to be traversed
  '--write'：
    optional, write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--exclude'：
    optional, directories and files to be ignored, multiple glob rules are separated by ',', e.g.: '. /dir/**.spec.js,. /anotherdir/**/*. *'
  '--silent'：
    optional, do not print files being processed (this will be ignored when '--write' is not present)

NOTE:
  only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
`,
    )
  }
  if (!args.write && args.silent) {
    console.warn(
      `'--silent=true' is ignored, it only take effect when '--write' is present.`,
    )
    args.silent = false
  }
  const absolutePath = resolve(process.cwd(), path)
  assert(isValidPath(absolutePath), 'Invalid path')
  await purge(path, {
    write: args.write,
    exclude: args.exclude,
    namespace: args.namespace,
    silent: args.silent,
  })
}

// const handleCheck = async () => {
//   const [path, localeRoot] = restArgs
//   if (args.help || !path || !localeRoot) {
//     console.info(
//       `a18n check <path> <localeRoot> [<options>]

// DESCRIPTION
//   check if there are text missing translation
//   scan locale resources under <localeRoot> and optionally code files under <path>. If untranslated texts are found, print and exit with none-zero code.

// OPTIONS:
//   '<path>'：required，code directory to be traversed
//   '<localeRoot>': required, directory to store locale resource files
//   '--wrap': check for unwrapped and unextracted text in code
//   '--extract': check for unwrapped and unextracted text in code
//   '--exclude'：
//     optional, directories and files to be ignored, multiple glob rules are separated by ',', e.g.: '. /dir/**.spec.js,. /anotherdir/**/*. *'
// `,
//     )
//     return
//   }

//   const absolutePath = resolve(process.cwd(), path)
//   const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
//   assert(isValidPath(absolutePath), 'invalid path')

//   await extract(path, {
//     localeRoot: absoluteLocaleRoot,
//     locales: args.locales
//       ? (args.locales as string)
//           .split(',')
//           .map((l) => l.trim())
//           .filter(Boolean)
//       : DEFAULT_LOCALES,
//     exclude: args.exclude,
//   })
// }

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
    // case 'check': {
    //   await handleCheck()
    //   break
    // }
    default:
      console.info('Supported commands: wrap, extract, purge')
      console.info('Run `a18n <command> --help` to see help for <command>')
      break
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(-1)
  })
