import { resolve, relative } from 'path'
import * as glob from 'fast-glob'
import { readFileSync, writeFileSync, statSync } from 'fs'

export const isValidPath = (path: string): boolean => {
  try {
    return isExist(path)
  } catch (error) {
    return false
  }
}

export const getFiles = (
  dir: string,
  options: { exclude?: string } = {},
): string[] => {
  const gitIgnoreFile = resolve(dir, './.gitignore')

  let gitIgnore = [] as string[]

  if (isExist(gitIgnoreFile)) {
    gitIgnore = readFile(gitIgnoreFile)
      .split('\n')
      .filter(Boolean)
      .map((rule) => rule.replace(/^\//, './'))
  }

  const extraIgnore = options.exclude ? options.exclude.split(',') : []

  const files = glob
    .sync('./**/*.*', {
      cwd: dir,
      ignore: gitIgnore.concat(extraIgnore),
      onlyFiles: true,
    })
    .map((reletivePath: any) => {
      return resolve(dir, reletivePath as string)
    })
  return files
}

export const isExist = (path: string) => {
  try {
    statSync(path)
    return true
  } catch (e) {
    return false
  }
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
