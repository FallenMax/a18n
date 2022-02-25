import chalk from 'chalk'
import { readdirSync } from 'fs'
import { join, relative } from 'path'
import { LocaleResource } from '../types'
import { sourceTextToKey } from '../util/locale'
import { toSourceText } from './extract'
import type * as TsxExtractor from './extract/tsx-extractor'
import { isKeyExisted } from './resource'
import { ExitCode } from './util/exit_code'
import { isFile, readFile } from './util/file'
import { flatten } from './util/flatten'
import { keepTruthy } from './util/keep_truthty'
import { processFiles } from './util/process_file'
import type * as TsxWrapper from './wrap/tsx-wrapper'

const extractorPath = require.resolve('./extract/tsx-extractor')
const wrapperPath = require.resolve('./wrap/tsx-wrapper')

//-------------- Utils --------------

const displayTable = (xs: string[][]) => {
  xs.forEach((x) => {
    console.info(
      x.map((str, i) => (i === 0 ? str : chalk.gray(str))).join('  '),
    )
  })
}

const importers = {
  json: (fileContent: string) => {
    return JSON.parse(fileContent)
  },
}
const getExistingResources = (
  localeRoot: string,
  locale: string,
): LocaleResource => {
  const filePath = join(localeRoot, `${locale}.json`)
  if (isFile(filePath)) {
    return importers.json(readFile(filePath))
  } else {
    return {}
  }
}

const getExistingLocales = (localeRoot: string): string[] => {
  const files = readdirSync(localeRoot)
  return keepTruthy(
    files.map((fileName) => {
      const [_, name] = /^(.+)\.json$/.exec(fileName) || []
      return name
    }),
  )
}

const cwd = process.cwd()
const displayPath = (path: string) => {
  return relative(cwd, path)
}

//-------------- Checkers --------------
export type CheckOptions = {
  localeRoot: string
  locales?: string[]
  skipWrap?: boolean
  skipExtract?: boolean
  skipResource?: boolean
  exclude?: string
  silent?: boolean
}

const checkWrap = async (
  files: string[],
  params: CheckOptions,
): Promise<boolean> => {
  process.stdout.write(
    chalk.yellow.bold`\nChecking for unwrapped texts in code ... `,
  )

  const results = await processFiles<typeof TsxWrapper, 'wrapFile'>(
    files,
    wrapperPath,
    'wrapFile',
    {
      silent: params.silent,
      exclude: params.exclude,
      write: false,
      checkOnly: true,
      namespace: undefined,
    },
  )

  let errors = []
  const sourceTexts = flatten(
    results.map((r) => {
      if (r.ok) {
        return r.sourceTexts!
      } else {
        errors.push(r)
        return []
      }
    }),
  )
  if (sourceTexts.length) {
    process.stdout.write(chalk.yellow.bold`found ${sourceTexts.length}:\n`)
    const list = sourceTexts.map((t) => {
      const key = sourceTextToKey(t)
      return [
        key,
        `${displayPath(t.context.path)}:${t.context.line || 1}:${
          t.context.column || 1
        }`,
      ]
    })
    displayTable(list)
    return false
  } else {
    process.stdout.write(chalk.yellow.bold`ok\n`)
    return true
  }
}

const checkExtract = async (
  files: string[],
  params: CheckOptions,
): Promise<boolean> => {
  process.stdout.write(
    chalk.yellow.bold`\nChecking for unextracted texts in code ... `,
  )
  const sourceTexts = flatten(
    (
      await processFiles<typeof TsxExtractor, 'extractFile'>(
        files,
        extractorPath,
        'extractFile',
        params,
      )
    )
      .filter((r) => r.ok)
      .map((r) => r.sourceTexts!),
  )

  const locales = params.locales || getExistingLocales(params.localeRoot)
  if (locales.length === 0) {
    process.stdout.write(
      chalk.yellow.bold`skipped: no locales are specified/exists\n`,
    )
    return true
  } else {
    process.stdout.write(chalk.yellow.bold`\n`)
  }

  let missingKeysExist = false
  for (const locale of locales) {
    const resource = getExistingResources(params.localeRoot, locale)
    const notExtracted = sourceTexts.filter((entry) => {
      const key = sourceTextToKey(entry)
      const exist = isKeyExisted(resource, entry.context.module, key)
      return !exist
    })

    if (notExtracted.length) {
      missingKeysExist = true
      console.info(chalk.green`${locale}: found ${notExtracted.length}:`)
      const list = notExtracted.map((entry) => {
        const key = sourceTextToKey(entry)
        const moduleName = entry.context.module
        const path = `${displayPath(entry.context.path)}:${
          entry.context.line || 1
        }:${entry.context.column || 1}`
        return [key, moduleName ?? '(root)', path]
      })
      displayTable(list)
    } else {
      console.info(chalk.green`${locale}: ok`)
    }
  }

  return !missingKeysExist
}

const checkResource = async (
  files: string[],
  params: CheckOptions,
): Promise<boolean> => {
  process.stdout.write(
    chalk.yellow
      .bold`\nChecking for untranslated texts in resource directory... `,
  )
  const locales = params.locales || getExistingLocales(params.localeRoot)
  if (locales.length === 0) {
    process.stdout.write(
      chalk.yellow.bold`skipped: no locales are specified/exists\n`,
    )
    return true
  } else {
    process.stdout.write(chalk.yellow.bold`\n`)
  }

  let missingValue = false
  for (const locale of locales) {
    const resource = getExistingResources(params.localeRoot, locale)
    let entries = toSourceText(resource).filter((text) => text.value == null)

    if (entries.length) {
      missingValue = true
      console.info(chalk.green`  ${locale}: found ${entries.length}:`)
      const list = entries.map((e) => {
        const key = sourceTextToKey(e)
        return [key, e.context.module ?? '']
      })
      displayTable(list)
    } else {
      console.info(chalk.green`  ${locale}: ok`)
    }
  }

  return !missingValue
}

export const check = async (files: string[], params: CheckOptions) => {
  const wrapOk = params.skipWrap || (await checkWrap(files, params))
  const extractOk = params.skipExtract || (await checkExtract(files, params))
  const resourceOk = params.skipResource || (await checkResource(files, params))

  if (!(wrapOk && extractOk && resourceOk)) {
    process.exit(ExitCode.CheckError)
  }
}
