import { getFiles, toAbsolutePath } from './file'

describe('file', () => {
  test('getFiles(): directory', () => {
    const files = getFiles('src/test/mock-project', {
      exclude: 'explicitly-excluded.js',
    })
    expect(files.sort()).toEqual(
      [
        './src/test/mock-project/js-ts-jsx-tsx.tsx',
        './src/test/mock-project/other-file.md',
        './src/test/mock-project/tsconfig.json',
        './src/test/mock-project/dir/file.ts',
      ]
        .sort()
        .map(toAbsolutePath),
    )
  })

  test('getFiles(): file', () => {
    const files = getFiles('src/test/mock-project/dir/file.ts')
    expect(files.sort()).toEqual(
      ['./src/test/mock-project/dir/file.ts'].sort().map(toAbsolutePath),
    )
  })

  test('getFiles(): glob', () => {
    const files = getFiles('src/test/mock-project/**/*.ts', {
      exclude: 'explicitly-excluded.js',
    })
    expect(files.sort()).toEqual(
      ['./src/test/mock-project/dir/file.ts'].sort().map(toAbsolutePath),
    )
  })

  test('getFiles(): mixed', () => {
    const files = getFiles(
      'src/test/mock-project/dir,src/test/mock-project/**/*.tsx,src/test/mock-project/**/*.js',
      {
        exclude: '**/explicitly-excluded.js',
      },
    )
    expect(files.sort()).toEqual(
      [
        './src/test/mock-project/js-ts-jsx-tsx.tsx',
        './src/test/mock-project/dir/file.ts',
      ]
        .sort()
        .map(toAbsolutePath),
    )
  })
})
