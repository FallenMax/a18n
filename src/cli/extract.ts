import assert from 'assert'
import mkdirp from 'mkdirp'
import { join } from 'path'
import { FormattedText, LocaleResource, SourceText } from '../types'
import { assertNever } from '../util/assert-never'
import { isObject } from '../util/is_object'
import type * as TsxExtractor from './extract/tsx-extractor'
import { getFormatted, putFormatted } from './resource'
import { appendKey } from './source_to_key'
import { isFile, readFile, writeFile } from './util/file'
import { flatten } from './util/flatten'
import { keepTruthy } from './util/keep_truthty'
import { processFiles } from './util/process_file'
const extractorPath = require.resolve('./extract/tsx-extractor')

export const importers = {
  json: (fileContent: string): LocaleResource => {
    return JSON.parse(fileContent)
  },
}
export const exporters = {
  json: (resource: LocaleResource): string => {
    return JSON.stringify(resource, null, 2)
  },
}

export type ReuseStrategy =
  | 'no'
  | 'same-module'
  | 'same-module-then-root'
  | 'all'

export const createResource = ({
  sourceTexts,
  old,
  keepUnused,
  reuseFrom = 'all',
}: {
  sourceTexts: SourceText[]
  old: LocaleResource
  keepUnused?: boolean
  reuseFrom?: ReuseStrategy
}): LocaleResource => {
  const resource: LocaleResource = keepUnused ? old : {}

  let keyToValue: { [Key: string]: FormattedText } = {}
  if (reuseFrom === 'all') {
    // build a map of key to value
    Object.keys(old).forEach((keyOrModName) => {
      const value = old[keyOrModName]
      if (isObject(value)) {
        const mod = value
        Object.keys(mod).forEach((key) => {
          keyToValue[key] = mod[key] ?? keyToValue[key]
        })
      } else if (typeof value === 'string') {
        keyToValue[keyOrModName] = value ?? keyToValue[keyOrModName]
      }
    })
  }

  sourceTexts.forEach((sourceText) => {
    const { key } = sourceText
    const moduleName = sourceText.module
    let existed: FormattedText = null
    switch (reuseFrom) {
      case 'no':
        break
      case 'same-module-then-root': {
        existed =
          getFormatted(old, moduleName, key) ??
          getFormatted(old, undefined, key) ??
          null
        break
      }
      case 'same-module': {
        existed = getFormatted(old, moduleName, key) ?? null
        break
      }
      case 'all': {
        existed =
          getFormatted(old, moduleName, key) ??
          getFormatted(old, undefined, key) ??
          keyToValue[key] ??
          null
        break
      }

      default:
        return assertNever(reuseFrom)
    }

    putFormatted(resource, moduleName, key, existed)
  })
  return resource
}

export const toSourceText = (o: LocaleResource, file = ''): SourceText[] => {
  let xs: SourceText[] = []
  Object.keys(o).forEach((keyOrMod) => {
    const value = o[keyOrMod]
    if (isObject(value)) {
      Object.keys(value).forEach((k) => {
        xs.push(
          appendKey({
            key: '',
            type: 'string',
            text: k,
            value: value[k] ?? null,
            path: file,
            module: keyOrMod,
          }),
        )
      })
    } else {
      xs.push(
        appendKey({
          key: '',
          type: 'string',
          text: keyOrMod,
          value: value ?? null,
          path: file,
          module: undefined,
        }),
      )
    }
  })
  return xs
}

export const extract = async (
  files: string[],
  params: {
    localeRoot: string
    locales: string[]
    exclude?: string
    silent?: boolean
    keepUnused?: boolean
    reuseFrom?: ReuseStrategy
  },
) => {
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
    if (isFile(filePath)) {
      const resource = importers.json(readFile(filePath))
      Object.assign(empty, resource)
    }
    return empty
  }

  mkdirp.sync(params.localeRoot)
  params.locales.forEach((locale) => {
    const oldResource = getExsitingResource(locale)
    const newResource = createResource({
      sourceTexts,
      old: oldResource,
      keepUnused: params.keepUnused,
    })
    const filePath = join(params.localeRoot, `${locale}.json`)
    const fileContent = exporters.json(newResource)
    writeFile(filePath, fileContent)
  })

  assert(
    results.every((r) => r.ok),
    'Some files failed to process',
  )
}
