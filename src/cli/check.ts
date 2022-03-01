import chalk from 'chalk'
import { readdirSync } from 'fs'
import { join, relative } from 'path'
import { LocaleResource, SourceText } from '../types'
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

const printSourceTexts = (sourceTexts: SourceText[]) => {
  const formatted = sourceTexts.map((s) => {
    const key = s.key
    const module = s.module ?? ''
    const path = s.path
      ? `${displayPath(s.path)}:${s.line || 1}:${s.column || 1}` ?? ''
      : ''
    return { key, module, path }
  })
  const hasModule = formatted.some((s) => s.module !== '')
  const hasPath = formatted.some((s) => s.path !== '')

  formatted.forEach((f) => {
    if (hasModule) {
      console.info(`${chalk.gray(f.module)}\t${f.key}\t${chalk.gray(f.path)}`)
    } else {
      console.info(`${f.key}\t${chalk.gray(f.path)}`)
    }
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
  json?: boolean
  locales?: string[]
  skipWrap?: boolean
  skipExtract?: boolean
  skipResource?: boolean
  exclude?: string
  silent?: boolean
}

type CheckResult = {
  ok: boolean
  checkType: string
  errors:
    | (SourceText & { key?: string })[]
    | { [Locale: string]: (SourceText & { key?: string })[] }
}

const checkWrap = async (
  files: string[],
  params: CheckOptions,
): Promise<CheckResult> => {
  const write = !params.json
  if (write) {
    process.stdout.write(
      chalk.yellow.bold`\nChecking for unwrapped texts in code ... `,
    )
  }

  const results = await processFiles<typeof TsxWrapper, 'wrapFile'>(
    files,
    wrapperPath,
    'wrapFile',
    {
      silent: params.silent || params.json,
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
    if (write) {
      process.stdout.write(chalk.yellow.bold`found ${sourceTexts.length}:\n`)
      printSourceTexts(sourceTexts)
    }
    return {
      ok: false,
      checkType: 'wrap',
      errors: sourceTexts,
    }
  } else {
    if (write) {
      process.stdout.write(chalk.yellow.bold`ok\n`)
    }
    return {
      ok: true,
      checkType: 'wrap',
      errors: [],
    }
  }
}

const checkExtract = async (
  files: string[],
  params: CheckOptions,
): Promise<CheckResult> => {
  const write = !params.json
  if (write) {
    process.stdout.write(
      chalk.yellow.bold`\nChecking for unextracted texts in code ... `,
    )
  }
  const sourceTexts = flatten(
    (
      await processFiles<typeof TsxExtractor, 'extractFile'>(
        files,
        extractorPath,
        'extractFile',
        { ...params, silent: params.silent || params.json },
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
    return {
      ok: true,
      checkType: 'extract',
      errors: [],
    }
  } else {
    if (write) {
      process.stdout.write(chalk.yellow.bold`\n`)
    }
  }

  let missingKeysExist = false
  let byLocale: { [Locale: string]: SourceText[] } = {}
  for (const locale of locales) {
    const resource = getExistingResources(params.localeRoot, locale)
    const notExtracted = sourceTexts.filter((entry) => {
      const key = entry.key
      const exist = isKeyExisted(resource, entry.module, key)
      return !exist
    })

    if (notExtracted.length) {
      missingKeysExist = true
      if (write) {
        console.info(chalk.green`${locale}: found ${notExtracted.length}:`)
        printSourceTexts(notExtracted)
      }
      byLocale[locale] = notExtracted
    } else {
      if (write) {
        console.info(chalk.green`${locale}: ok`)
      }
      byLocale[locale] = []
    }
  }

  return missingKeysExist
    ? {
        ok: false,
        checkType: 'extract',
        errors: byLocale,
      }
    : {
        ok: true,
        checkType: 'extract',
        errors: byLocale,
      }
}

const checkResource = async (
  files: string[],
  params: CheckOptions,
): Promise<CheckResult> => {
  const write = !params.json
  if (write) {
    process.stdout.write(
      chalk.yellow
        .bold`\nChecking for untranslated texts in resource directory... `,
    )
  }
  const locales = params.locales || getExistingLocales(params.localeRoot)
  if (locales.length === 0) {
    process.stdout.write(
      chalk.yellow.bold`skipped: no locales are specified/exists\n`,
    )
    return {
      ok: true,
      checkType: 'resource',
      errors: {},
    }
  } else {
    if (write) {
      process.stdout.write(chalk.yellow.bold`\n`)
    }
  }

  let missingValue = false
  let byLocale: { [Locale: string]: SourceText[] } = {}
  for (const locale of locales) {
    const resource = getExistingResources(params.localeRoot, locale)
    let missingResource = toSourceText(resource).filter(
      (text) => text.value == null,
    )

    if (missingResource.length) {
      missingValue = true
      if (write) {
        console.info(chalk.green`${locale}: found ${missingResource.length}:`)
        printSourceTexts(missingResource)
      }
      byLocale[locale] = missingResource
    } else {
      if (write) {
        console.info(chalk.green`${locale}: ok`)
      }
      byLocale[locale] = []
    }
  }

  return missingValue
    ? {
        ok: true,
        checkType: 'resource',
        errors: byLocale,
      }
    : {
        ok: false,
        checkType: 'resource',
        errors: byLocale,
      }
}

export const check = async (files: string[], params: CheckOptions) => {
  const wrapResult = !params.skipWrap
    ? await checkWrap(files, params)
    : { ok: true, checkType: 'wrap', errors: [] }

  const extractResult = !params.skipExtract
    ? await checkExtract(files, params)
    : { ok: true, checkType: 'extract', errors: {} }

  const resourceResult = !params.skipResource
    ? await checkResource(files, params)
    : { ok: true, checkType: 'resource', errors: {} }
  if (params.json) {
    const results = keepTruthy([
      !params.skipWrap && wrapResult,
      !params.skipExtract && extractResult,
      !params.skipResource && resourceResult,
    ])

    process.stdout.write(JSON.stringify(results, null, 2))
  }

  if (!(wrapResult.ok && extractResult.ok && resourceResult.ok)) {
    process.exit(ExitCode.CheckError)
  }
}
