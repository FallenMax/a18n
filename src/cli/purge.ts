import { parse } from 'path'
import { tsxPurger } from './purge/tsx-purger'
import { getFiles, readFile, writeFile } from './util/file'

type Purger = (content: string, options: {}) => string

export const purgers: {
  [K: string]: Purger
} = {
  js: tsxPurger({ ext: 'js' }),
  jsx: tsxPurger({ ext: 'jsx' }),
  ts: tsxPurger({ ext: 'ts' }),
  tsx: tsxPurger({ ext: 'tsx' }),
}

const purgeFromFile = (
  filePath: any,
  params: {
    write: boolean
    namespace: string | undefined
  },
): void => {
  const { namespace } = params
  const content = readFile(filePath)
  const ext = parse(filePath).ext.substr(1)
  const transformer = purgers[ext]
  if (!transformer) {
    throw new Error('unknown file extension: ' + filePath)
  }
  const newContent = transformer(content, { namespace })

  if (newContent !== content) {
    if (params.write) {
      writeFile(filePath, newContent)
    } else {
      console.info(filePath)
    }
  }
}

export const purge = (
  path: string,
  params: {
    write: boolean
    exclude?: string
    namespace: string | undefined
  },
) => {
  const isSourceCode = (filePath: any): boolean => {
    return /\.(js|ts)x?$/.test(filePath)
  }

  const files = getFiles(path, { exclude: params.exclude }).filter(isSourceCode)

  if (!params.write) {
    console.info(
      `Dry run mode, files below will be modified (use --write to actually write files): `,
    )
    console.info(`---`)
  }

  let errorFiles = [] as string[]
  files.forEach((file) => {
    try {
      purgeFromFile(file, params)
    } catch (error) {
      errorFiles.push(file)
      console.info('[a18n] error transforming:', file)
      console.error(error)
    }
  })

  if (errorFiles.length) {
    console.info('There are errors when processing files below:')
    console.info('---')
    errorFiles.forEach((file) => console.info(file))
  }
}
