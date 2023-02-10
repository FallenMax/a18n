import assert from 'assert'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import parseArgs from 'yargs-parser'
import { check } from './check'
import { DEFAULT_LOCALES } from './constants'
import { extract } from './extract'
import { purge } from './purge'
import { replace } from './replace'
import { ExitCode } from './util/exit_code'
import { getFiles, isDirectory, isSourceCode } from './util/file'
import { wrap } from './wrap'

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
    'module-name-update',
  ],
})
const [command, ...restArgs] = args._ as string[]
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

DESCRIPTION:
  Modifies code files at the given <path>, wrapping string literals and tagged template literals with the default translate function 'a18n("string_literal")' or 'a18n\`template\${string}\`.
  If no <path> is given, stdin is read as a list of files.

OPTIONS:
  '<path>':
    file/dir/glob of code files to be processed. Multiple entries are separated by commas.
  '--write':
    Writes files in place. If not provided, a18n will perform a dry run and print the files to be modified.
  '--text=':
    Which texts should be wrapped:
      'cjk': CJK texts (Chinese, Japanese, Korean)
      'prefix': (experimental) texts starts with special marker "@@", e.g. "@@Hello world"
  '--namespace=':
    A name that uniquely identifies the current project, which helps avoid resource conflicts with other dependencies that also use "a18n".
  '--module-name=':
    Generates a module name using the provided template. If no default module name is provided, '--namespace' must be provided.
    For example, running "a18n wrap a/b/c/foo.ts --namespace=my-ns --module-name=filePath" will insert: 
      "const a18n = getA18n('my-ns', 'a/b/c/foo')"
    The resulting a18n instance will use 'resource['a/b/c/foo']' instead of 'resource' when translating at runtime. 
    Available template values are:
      'fileDirAndName': "a/b/c/foo.ts" will be "c/foo"
      'filePath': "a/b/c/foo.ts" will be "a/b/c/foo"
      'fileName': "a/b/c/foo.ts" will be "foo"
  '--module-name-update':
    When using '--module-name', updates the existing module name to the new name. Default is true.
  '--exclude=':
    Directories and files to be ignored. Multiple glob rules are separated by a comma, e.g.: './dir/**.spec.js,./anotherdir/**/*. *'
  '--silent':
    Do not print files being processed (this will be ignored when '--write' is not present)

NOTE:
  Only .js, .ts, .jsx, .tsx files are supported.
  .gitignore is respected by default.
  Use "// @a18n-ignore" to ignore the next line, and "// @a18n-ignore-file" to ignore the entire file.
`,
    )
    return
  }
  if (args['module-name'] && !args['namespace']) {
    console.error('`--module-name` requires `--namespace`')
    process.exit(ExitCode.InvalidArgument)
  }
  if (args['module-name-update'] && !args['module-name']) {
    console.error('`--module-name-update` requires `--module-name`')
    process.exit(ExitCode.InvalidArgument)
  }

  if (!args.write && args.silent) {
    args.silent = false
  }
  await wrap(files, {
    write: args.write,
    exclude: args.exclude,
    silent: args.silent,
    text: args.text ?? 'cjk',
    basePath: process.cwd(),
    namespace: args.namespace,
    moduleName: args.moduleName,
    moduleNameUpdate: args.moduleNameUpdate,
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
  Extract texts from code files in the given <path>, and write them to the <localeRoot> directory.
  Texts to be translated must be wrapped in 'a18n()' or 'a18n\`\`.
  If there are existing translations, they will be reused. By default, unused keys will be removed.
  If no <path> is given, stdin is read as a list of files.

OPTIONS:
  '<path>':
    file/dir/glob of code files to be processed. Multiple entries are separated by commas.
  '<localeRoot'>:
    Directory to store locale resource files
  '--locales=':
    Languages to export, separated by a comma. Example: 'da,de-AT,de-CH,de-DE'
  '--keep-unused':
    Keep unused texts/translations, even if they are not found in the code being extracted.
  '--reuse-from=':
    Specify where to look for existing translations (in the locale resource folder):
      'all': (default) reuse translations from the same module, then from the root, then from other modules
      'same-module-then-root': reuse translations from the same module, if not found, then from the root
      'same-module': only reuse translations from the same module
      'no': do not reuse translations, meaning all values will be "null" after extraction
  '--silent':
    Do not print the names of the files being processed.
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
    keepUnused: args.keepUnused,
    reuseFrom: args.reuseFrom,
  })
}

const handlePurge = async () => {
  const [path] = restArgs
  const files = getFileList(path)
  if (args.help || !files) {
    console.info(
      `a18n purge <path> --write [<options>]

DESCRIPTION:
  Modify code files in the specified <path>, removing 'a18n()/a18n\`\`' translation calls and import statements.
  If no <path> is given, stdin is read as a list of files.

OPTIONS:
  '<path>':
    File/dir/glob of code files to be processed. Multiple entries are separated by commas.
  '--write':
    Write changes to the file in place. If not provided, a18n will perform a dry run and print the files that would be modified.
  '--exclude=':
    Directories and files to be ignored, specified as multiple glob rules separated by commas, e.g.: './dir/.spec.js,./anotherdir//*. *'
  '--silent':
    Do not print the names of files being processed (this option will be ignored if '--write' is not present).

NOTE:
  Only .js, .ts, .jsx, and .tsx files are supported.
  .gitignore is respected by default.
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
  Analyze code files from given <path> and translated texts at <localeRoot>, check for untranslated texts. If any, print and exit with error code. 
  Stdin is read as file list if it is piped to a18n and no <path> is given.

  The following "missing translations" will be checked:

  - Texts in code that are not wrapped as expected
  - Texts in code that are not extracted to the localeResources folder
  - Texts in localeResources with no translation (keys with value null)
  - Any incorrect translation calls and syntax errors found in the process

OPTIONS:
  '<path>':
    File/dir/glob of code files to be processed. Multiple entries are separated by commas.
  '<localeRoot>':
    The directory containing the localeResources files.
  '--locales=<localeRoot>':
    Specify the locales to check. By default, all locale files under <localeRoot> are checked.
  '--json':
    Print the result in JSON format.
  '--skip-wrap':
    Do not check for unwrapped texts.
  '--skip-extract':
    Do not check for unextracted texts.
  '--skip-resource':
    Do not check for missing translations.
  '--exclude=':
    Directories and files to be ignored, specified using glob patterns separated by a comma (e.g. './dir/**.spec.js,./anotherdir/**/*.*').
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
    json: args['json'],
    exclude: args.exclude,
    silent: true,
  })
}
const handleReplace = async () => {
  let [
    /* path, optional */
    p0,
    /** localeRoot */
    p1,
    /** locale */
    p2,
  ] = restArgs
  let files: string[] | undefined
  if (p0 && p1 && p2) {
    files = getFileList(p0)
  } else if (p0 && p1) {
    ;[p1, p2] = [p0, p1]
    files = getFileList(undefined)
  }

  if (args.help || !files) {
    console.info(
      `a18n replace <path> <localeRoot> <locale> --write [<options>]

DESCRIPTION
  Modify code files from the given <path>, replacing texts wrapped in 'a18n()/a18n\`\`' calls with translated texts using the target <locale> and resources in <localeRoot>.
  Stdin is read as file list if it is piped to a18n and no <path> is given.

OPTIONS:
  '<path>':
    file/dir/glob, code files to be processed. Multiple entries are separated by a comma.
  '<localeRoot'>:
    Directory where the locale resource files are stored
  '<locale>':
    Target language to be translated to. Example: 'en-US'. The corresponding resource file (en-US.json) is expected to exist under <localeRoot>.
  '--write':
    Write the files in place. If not provided, a18n will perform a dry run and print the files to be modified.
  '--exclude=':
    Directories and files to be ignored, specified using multiple glob rules separated by a comma. Example: './dir/.spec.js,./anotherdir//*. *'
  '--silent':
    Do not print the files being processed (this will be ignored when '--write' is not present).

NOTE:
  Only .js, .ts, .jsx, and .tsx files are supported.
  .gitignore is respected by default.
  To remove a18n calls, use the a18n purge command.
`,
    )
    return
  }
  const absoluteLocaleRoot = resolve(process.cwd(), p1)
  assert(
    isDirectory(absoluteLocaleRoot),
    `locale root is not a directory: ${p1}`,
  )

  if (!args.write && args.silent) {
    args.silent = false
  }
  await replace(files, {
    localeRoot: absoluteLocaleRoot,
    locale: p2,
    write: args.write,
    exclude: args.exclude,
    silent: args.silent,
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
    case 'replace': {
      await handleReplace()
      break
    }
    default:
      console.info('Supported commands: wrap, extract, check, replace, purge')
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
    process.exit(ExitCode.UnknownError)
  })
