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

  test('remove a18n setup methods', () => {
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

  test('remove a18n.x method', () => {
    const source = `const s15_1 = (
  <>
    {a18n('我喜欢2')}
    <input type="text" placeholder={a18n('这样子2')} />
    <span>{a18n.x\`你有\${(<strong>{a18n('很多')}</strong>)}封未读邮件\`}</span>
  </>
)`
    const expected = format(`
    const s15_1 = (
      <>
        我喜欢2
        <input type=\"text\" placeholder='这样子2' />
        <span>{['你有', <strong>很多</strong>, '封未读邮件']}</span>
      </>
    )`)
    expect(format(purgeCode(source))).toBe(expected)
    // ensure nothing changes for second purge
    expect(format(purgeCode(expected))).toBe(expected)
  })
})
