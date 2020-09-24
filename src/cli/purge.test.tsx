import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { purgeCode } from './purge/tsx-purger'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
describe('purge', () => {
  test('remove a18n() calls and imports ', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-output.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const expected = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/purge-output.mock.tsx'),
      { encoding: 'utf-8' },
    )

    expect(format(purgeCode(source))).toBe(format(expected))
    // ensure nothing changes for second purge
    expect(purgeCode(expected)).toBe(expected)
  })

  test('remove a18n methods', () => {
    const source = `const { getA18n } = require('a18n')
const a18n__ = getA18n('your-namespace')

/* @a18n-ignore-file */
// @a18n-ignore
const a18n_ = require('a18n')
a18n.addLocaleResource('en-US', {})
a18n.setLocaleSync('zh-CN')`
    const expected = ``
    expect(purgeCode(source)).toBe(expected)
    // ensure nothing changes for second purge
    expect(purgeCode(expected)).toBe(expected)
  })
})
