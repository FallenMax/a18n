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
  boolean: ['write'],
})
const [command, ...restArgs] = args._

switch (command) {
  case 'wrap': {
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

NOTE:
  only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
  use "// @a18n-ignore" to ignore next line, use "// @a18n-ignore-file" to ignore entire file
`,
      )
      break
    }
    const absolutePath = resolve(process.cwd(), path)
    assert(isValidPath(absolutePath), 'Invalid path')
    wrap(path, {
      write: args.write,
      exclude: args.exclude,
      namespace: args.namespace,
    })
    break
  }

  case 'extract': {
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
`,
      )
      break
    }

    const absolutePath = resolve(process.cwd(), path)
    const absoluteLocaleRoot = resolve(process.cwd(), localeRoot)
    assert(isValidPath(absolutePath), 'invalid path')

    extract(path, {
      localeRoot: absoluteLocaleRoot,
      locales: args.locales
        ? (args.locales as string)
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean)
        : DEFAULT_LOCALES,
      exclude: args.exclude,
      format: args.format || 'json',
    })
    break
  }

  case 'purge': {
    const [path] = restArgs
    if (args.help || !path) {
      console.info(
        `a18n purge <path> --write [<options>]

DESCRIPTION
  (if you wish to replace a18n with another translation solution), this command will traverse code files in <path> directory, remove 'a18n()/a18n\`\`' translation calls and import statements

OPTIONS:
  '<path>'：required，code directory to be traversed
  '--write'：
    optional, write files in place. if not provided, a18n will perform a dry run and print files to be modified
  '--exclude'：
    optional, directories and files to be ignored, multiple glob rules are separated by ',', e.g.: '. /dir/**.spec.js,. /anotherdir/**/*. *'

NOTE:
  only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default
`,
      )
      break
    }
    const absolutePath = resolve(process.cwd(), path)
    assert(isValidPath(absolutePath), 'Invalid path')
    purge(path, {
      write: args.write,
      exclude: args.exclude,
      namespace: args.namespace,
    })
    break
  }

  default:
    console.info('Supported commands: wrap, extract, purge ')
    console.info('Run `a18n <command> --help` to see help for <command>')
    break
}
