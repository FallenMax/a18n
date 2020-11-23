import mkdirp from 'mkdirp'
import { join } from 'path'
import {
  LocaleResource,
  LocaleResourceExtracted,
  SourceTextWithContext,
} from '../types'
import { sourceTextToKey } from '../util/locale'
import type * as TsxExtractor from './extract/tsx-extractor'
import {
  getFiles,
  isExist,
  isSourceCode,
  readFile,
  writeFile,
} from './util/file'
import { flatten } from './util/flatten'
import { keepTruthy } from './util/keep_truthty'
import { processFiles } from './util/process_file'
const extractorPath = require.resolve('./extract/tsx-extractor')

export const importers = {
  json: (fileContent) => {
    return JSON.parse(fileContent)
  },
} as {
  [K: string]: (fileContent: string) => LocaleResource
}

export const exporters = {
  json: (resource) => {
    const output = {} as LocaleResource
    Object.keys(resource).forEach((key) => {
      output[key] = resource[key].value
    })
    return JSON.stringify(output, null, 2)
  },
} as {
  [K: string]: (
    localeResource: LocaleResourceExtracted,
    moduleName: string,
  ) => string
}

export const createResource = (
  sourceTexts: SourceTextWithContext[],
  existed: LocaleResource,
  keepUnused?: boolean,
): LocaleResourceExtracted => {
  let resource = {} as LocaleResourceExtracted
  if (keepUnused) {
    Object.keys(existed).forEach((key) => {
      resource[key] = {
        value: (existed && existed[key]) ?? null,
        contexts: [],
      }
    })
  }

  sourceTexts.forEach((sourceText) => {
    const key = sourceTextToKey(sourceText)
    if (!resource[key]) {
      resource[key] = {
        value: (existed && existed[key]) ?? null,
        contexts: [sourceText.context],
      }
    } else {
      resource[key].contexts.push(sourceText.context)
    }
  })
  return resource
}

export const extract = async (
  path: string,
  params: {
    localeRoot: string
    locales: string[]
    exclude?: string
    silent?: boolean
    keepUnused?: boolean
  },
) => {
  const files = getFiles(path, { exclude: params.exclude }).filter(isSourceCode)

  const results = await processFiles<typeof TsxExtractor, 'extractFile'>(
    files,
    extractorPath,
    'extractFile',
    params,
  )

  const sourceTexts = keepTruthy(
    flatten(
      results.map((r) => {
        if (r.ok && r.sourceTexts) {
          return r.sourceTexts
        }
      }),
    ),
  )

  const getExsitingResource = (locale: string): LocaleResource => {
    const empty = {} as LocaleResource
    const filePath = join(params.localeRoot, `${locale}.json`)
    if (isExist(filePath)) {
      const resource = importers.json(readFile(filePath))
      Object.assign(empty, resource)
    }
    return empty
  }

  mkdirp.sync(params.localeRoot)
  params.locales.forEach((locale) => {
    const existingResource = getExsitingResource(locale)
    const nextResource = createResource(
      sourceTexts,
      existingResource,
      params.keepUnused,
    )
    const filePath = join(params.localeRoot, `${locale}.json`)
    const fileContent = exporters.json(nextResource, locale)
    writeFile(filePath, fileContent)
  })
}
