import { getFiles } from './file'
import { resolve } from 'path'

describe('file', () => {
  test('getFiles()', () => {
    const cwd = process.cwd()
    const dir = resolve(cwd, './src/test/mock-project')
    const files = getFiles(dir, { exclude: 'explicitly-excluded.js' })
    expect(files.sort()).toEqual(
      [
        './src/test/mock-project/js-ts-jsx-tsx.tsx',
        './src/test/mock-project/other-file.md',
        './src/test/mock-project/tsconfig.json',
        './src/test/mock-project/dir/file.ts',
      ]
        .sort()
        .map((relativePath) => resolve(cwd, relativePath)),
    )
  })
})
