import mkdirp from 'mkdirp'
import { join, parse } from 'path'
import {
  LocaleResource,
  LocaleResourceExtracted,
  SourceTextWithContext,
} from '../types'
import { sourceTextToKey } from '../util/locale'
import { tsxExtractor } from './extract/tsx-extractor'
import { getFiles, isExist, readFile, writeFile } from './util/file'

const isSourceCode = (filePath: any): boolean => {
  return /\.(js|ts)x?$/.test(filePath)
}

export const extractors = {
  js: tsxExtractor({ ext: 'js' }),
  jsx: tsxExtractor({ ext: 'jsx' }),
  ts: tsxExtractor({ ext: 'ts' }),
  tsx: tsxExtractor({ ext: 'tsx' }),
} as {
  [K: string]: (content: string, filePath: string) => SourceTextWithContext[]
}

export const importers = {
  json: (fileContent) => {
    return JSON.parse(fileContent)
  },
} as {
  [K: string]: (fileContent: string) => LocaleResource
}

const extensions = {
  json: 'json',
}

export const createResource = (
  sourceTexts: SourceTextWithContext[],
  existed?: LocaleResource,
): LocaleResourceExtracted => {
  const resource = {} as LocaleResourceExtracted
  sourceTexts.forEach((sourceText) => {
    const key = sourceTextToKey(sourceText)
    if (!resource[key]) {
      resource[key] = {
        value: (existed && existed[key]) || null,
        contexts: [sourceText.context],
      }
    } else {
      resource[key].contexts.push(sourceText.context)
    }
  })
  return resource
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

const extractSourceText = (filePath: string): SourceTextWithContext[] => {
  const content = readFile(filePath)
  const ext = parse(filePath).ext.substr(1)
  const extractor = extractors[ext]
  if (!extractor) {
    throw new Error('unknown file extension: ' + filePath)
  }
  const locales = extractor(content, filePath)
  return locales
}

export const extract = (
  path: string,
  params: {
    localeRoot: string
    locales: string[]
    format: 'json'
    exclude?: string
  },
) => {
  const files = getFiles(path, { exclude: params.exclude }).filter(isSourceCode)
  let errorFiles = [] as string[]

  const sourceTexts = ([] as SourceTextWithContext[]).concat(
    ...files.map((file) => {
      try {
        return extractSourceText(file)
      } catch (error) {
        errorFiles.push(file)
        console.info('[a18n] error extracting:', file)
        console.error(error)

        return []
      }
    }),
  )

  mkdirp.sync(params.localeRoot)

  const getExsitingResource = (locale: string): LocaleResource => {
    const empty = {} as LocaleResource
    const extensions = ['json', 'js']
    extensions.forEach((ext) => {
      const filePath = join(params.localeRoot, `${locale}.${ext}`)
      if (isExist(filePath)) {
        const resource = importers[ext](readFile(filePath))
        Object.assign(empty, resource)
      }
    })
    return empty
  }

  params.locales.forEach((locale) => {
    const existingResource = getExsitingResource(locale)
    const nextResource = createResource(sourceTexts, existingResource)
    const filePath = join(
      params.localeRoot,
      `${locale}.${extensions[params.format]}`,
    )
    const fileContent = exporters[params.format](nextResource, locale)

    writeFile(filePath, fileContent)
  })

  if (errorFiles.length) {
    console.info('下面这些文件提取失败了:')
    console.info('---')
    errorFiles.forEach((file) => console.info(file))
  }
}
