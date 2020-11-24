import chalk from 'chalk'
import { readdirSync } from 'fs'
import { join, relative } from 'path'
import { LocaleResource } from '../types'
import { sourceTextToKey } from '../util/locale'
import type * as TsxExtractor from './extract/tsx-extractor'
import { ExitCode } from './util/exit_code'
import { isFile, readFile } from './util/file'
import { flatten } from './util/flatten'
import { keepTruthy } from './util/keep_truthty'
import { processFiles } from './util/process_file'
import type * as TsxWrapper from './wrap/tsx-wrapper'

const extractorPath = require.resolve('./extract/tsx-extractor')
const wrapperPath = require.resolve('./wrap/tsx-wrapper')

//-------------- Utils --------------

const truncate = (text: string) =>
  text.length > 20 ? text.slice(0, 17) + '...' : text

const displayTable = (xs: string[][], { indent = 0 } = {}) => {
  xs.forEach((x) => {
    console.info(
      ' '.repeat(indent) +
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

const fromEntries = <T>(entries: [string, T][]): Record<string, T> => {
  let o: Record<string, T> = {}
  for (let index = 0; index < entries.length; index++) {
    const [key, value] = entries[index]
    o[key] = value
  }
  return o
}
const excludeKeys = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  let excluded: string[] = []
  for (const key in a) {
    if (Object.prototype.hasOwnProperty.call(a, key)) {
      if (!(key in b)) {
        excluded.push(key)
      }
    }
  }
  return excluded
}

const cwd = process.cwd()
const displayPath = (path: string) => {
  return relative(cwd, path)
}

//-------------- Checkers --------------
export type CheckParams = {
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
  params: CheckParams,
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
      const key = truncate(sourceTextToKey(t))
      return [
        key,
        `${displayPath(t.context.path)}:${t.context.line || 1}:${
          t.context.column || 1
        }`,
      ]
    })
    displayTable(list, { indent: 2 })
    return false
  } else {
    process.stdout.write(chalk.yellow.bold`ok\n`)
    return true
  }
}

const checkExtract = async (
  files: string[],
  params: CheckParams,
): Promise<boolean> => {
  process.stdout.write(
    chalk.yellow.bold`\nChecking for unextracted texts in code ... `,
  )
  const results = await processFiles<typeof TsxExtractor, 'extractFile'>(
    files,
    extractorPath,
    'extractFile',
    params,
  )

  const keyPathPairs = flatten(
    keepTruthy(
      results.map((r) => {
        if (r.ok) {
          return r.sourceTexts!.map((s) => {
            const key = sourceTextToKey(s)
            const path = `${displayPath(s.context.path)}:${
              s.context.line || 1
            }:${s.context.column || 1}`
            return [key, path] as [string, string]
          })
        } else {
          return undefined
        }
      }),
    ),
  )
  const keyPathDict = fromEntries(keyPathPairs)
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
    let missingKeys = excludeKeys(keyPathDict, resource)

    if (missingKeys.length) {
      missingKeysExist = true
      console.info(chalk.green`  ${locale}: found ${missingKeys.length}:`)
      const list = missingKeys.map((key) => {
        return [truncate(key), keyPathDict[key]]
      })
      displayTable(list, { indent: 4 })
    } else {
      console.info(chalk.green`  ${locale}: ok`)
    }
  }

  return !missingKeysExist
}

const checkResource = async (
  files: string[],
  params: CheckParams,
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
    let entriesWithoutValue = Object.entries(resource).filter(
      ([key, value]) => value == null,
    )

    if (entriesWithoutValue.length) {
      missingValue = true
      console.info(
        chalk.green`  ${locale}: found ${entriesWithoutValue.length}:`,
      )
      const list = entriesWithoutValue.map(([key]) => {
        return [truncate(key)]
      })
      displayTable(list, { indent: 4 })
    } else {
      console.info(chalk.green`  ${locale}: ok`)
    }
  }

  return !missingValue
}

export const check = async (files: string[], params: CheckParams) => {
  const wrapOk = params.skipWrap || (await checkWrap(files, params))
  const extractOk = params.skipExtract || (await checkExtract(files, params))
  const resourceOk = params.skipResource || (await checkResource(files, params))

  if (!(wrapOk && extractOk && resourceOk)) {
    process.exit(ExitCode.CheckError)
  }
}
