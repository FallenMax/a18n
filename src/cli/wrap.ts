import { parse } from 'path'
import { getFiles, readFile, writeFile } from './util/file'
import { tsxWrapper } from './wrap/tsx-wrapper'

type Wrapper = (
  content: string,
  options: { namespace: string | undefined },
) => string

export const wrappers: {
  [K: string]: Wrapper
} = {
  js: tsxWrapper({ ext: 'js' }),
  jsx: tsxWrapper({ ext: 'jsx' }),
  ts: tsxWrapper({ ext: 'ts' }),
  tsx: tsxWrapper({ ext: 'tsx' }),
}

const wrapStringInFile = (
  filePath: any,
  params: {
    write: boolean
    namespace: string | undefined
  },
): void => {
  const { namespace } = params
  const content = readFile(filePath)
  const ext = parse(filePath).ext.substr(1)
  const transformer = wrappers[ext]
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

export const wrap = (
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
      wrapStringInFile(file, params)
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
