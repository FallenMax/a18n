import * as glob from 'fast-glob'
import { readFileSync, statSync, writeFileSync } from 'fs'
import { relative, resolve } from 'path'

export const isSourceCode = (filePath: any): boolean => {
  return /\.(js|ts)x?$/.test(filePath)
}

export const isDirectory = (path: string): boolean => {
  try {
    const stat = statSync(path)
    return stat.isDirectory()
  } catch (error) {
    return false
  }
}
export const toAbsolutePath = (path: string): string => {
  return path.startsWith('/') ? path : resolve(process.cwd(), path)
}

export const isFile = (path: string) => {
  try {
    return statSync(path).isFile()
  } catch (e) {
    return false
  }
}

export const getFiles = (
  /** file/dir/glob */
  paths: string,
  options: { exclude?: string } = {},
): string[] => {
  const extraIgnore = options.exclude ? options.exclude.split(',') : []

  let files: string[] = []
  paths.split(',').forEach((path) => {
    const absolutePath = toAbsolutePath(path)
    if (isFile(absolutePath)) {
      files.push(absolutePath)
    } else if (isDirectory(absolutePath)) {
      const gitIgnoreFile = resolve(absolutePath, '.gitignore')
      let gitIgnore = [] as string[]
      if (isFile(gitIgnoreFile)) {
        gitIgnore = readFile(gitIgnoreFile)
          .split('\n')
          .filter(Boolean)
          .map((rule) => rule.replace(/^\//, './'))
      }
      const ignore = gitIgnore.concat(extraIgnore)

      const filesInDir = glob.sync('**/*.*', {
        cwd: absolutePath,
        ignore,
        onlyFiles: true,
        absolute: true,
      })
      files.push(...filesInDir)
    } else {
      const gitIgnoreFile = resolve(process.cwd(), '.gitignore')
      let gitIgnore = [] as string[]
      if (isFile(gitIgnoreFile)) {
        gitIgnore = readFile(gitIgnoreFile)
          .split('\n')
          .filter(Boolean)
          .map((rule) => rule.replace(/^\//, './'))
      }
      const ignore = gitIgnore.concat(extraIgnore)

      const globFiles = glob.sync(path, {
        ignore,
        onlyFiles: true,
        absolute: true,
      })
      files.push(...globFiles)
    }
  })

  return dedupe(files)
}

const dedupe = (texts: string[]) => {
  let o = Object.create(null)
  texts.forEach((t) => (o[t] = true))
  return Object.keys(o)
}

export const readFile = (path: string) => {
  return readFileSync(path, {
    encoding: 'utf-8',
  })
}

export const writeFile = (path: string, content: string): void => {
  writeFileSync(path, content, {
    encoding: 'utf-8',
  })
}

export const toRelative = (absPath: string) => {
  return relative(process.cwd(), absPath)
}
