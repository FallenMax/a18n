import assert from 'assert'
import { join } from 'path'
import type * as TsxReplacer from './replace/tsx-replacer'
import { isFile, readFile } from './util/file'
import { processFiles } from './util/process_file'

const replacerPath = require.resolve('./replace/tsx-replacer')

export type ReplaceParams = {
  localeRoot: string
  locale: string
  write: boolean
  exclude?: string
  silent?: boolean
}

const importers = {
  json: (fileContent: string) => {
    return JSON.parse(fileContent)
  },
}

const replaceFiles = async (
  files: string[],
  params: ReplaceParams,
): Promise<boolean> => {
  const { localeRoot, locale } = params
  const filePath = join(localeRoot, `${locale}.json`)
  const resource = isFile(filePath) && importers.json(readFile(filePath))
  if (!(typeof resource === 'object' && resource)) {
    throw new Error(
      `Failed to load resource from provided <localeRoot>/<locale>.json: ${filePath}`,
    )
  }
  const results = await processFiles<typeof TsxReplacer, 'replaceFile'>(
    files,
    replacerPath,
    'replaceFile',
    {
      silent: params.silent,
      exclude: params.exclude,
      write: params.write,
      locale: params.locale,
      resource,
    },
  )

  // TODO: list missing/mismatch texts
  return results.every((r) => r.ok)
}

export const replace = async (files: string[], params: ReplaceParams) => {
  if (!params.write) {
    console.warn(
      `Dry run mode, files below will be modified (use --write to actually write files): `,
    )
    console.warn(`---`)
  }
  const { localeRoot, locale } = params
  const filePath = join(localeRoot, `${locale}.json`)
  const resource = isFile(filePath) && importers.json(readFile(filePath))

  const results = await processFiles<typeof TsxReplacer, 'replaceFile'>(
    files,
    replacerPath,
    'replaceFile',
    {
      silent: params.silent,
      exclude: params.exclude,
      write: params.write,
      locale: params.locale,
      resource,
    },
  )

  assert(
    results.every((r) => r.ok),
    'Some files failed to process',
  )
}
