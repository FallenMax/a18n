import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { purgeCode } from './purge/tsx-purger'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}

const assertEqualFormatted = (a: string, b: string) => {
  expect(format(a)).toBe(format(b))
}
describe('purge', () => {
  test.skip('remove a18n() calls and imports ', () => {
    const sourcePath = resolve(
      __dirname,
      '../../src/cli/__test__/wrap-output.mock.tsx',
    )
    const source = readFileSync(sourcePath, { encoding: 'utf-8' })
    const expectedPath = resolve(
      __dirname,
      '../../src/cli/__test__/purge-output.mock.tsx',
    )
    const expected = readFileSync(expectedPath, { encoding: 'utf-8' })

    assertEqualFormatted(purgeCode(source, sourcePath), expected)
    // ensure nothing changes for second purge
    expect(purgeCode(expected, expectedPath)).toBe(expected)
  })

  test('remove a18n setup methods', () => {
    const source = `const { getA18n } = require('a18n')
const a18n__ = getA18n('your-namespace')
const a18n2__ = getA18n('your-namespace', 'my-module')

/* @a18n-ignore-file */
// @a18n-ignore
const a18n_ = require('a18n')
a18n.addLocaleResource('en-US', {})
a18n.setLocaleSync('zh-CN')`
    const expected = ``
    expect(purgeCode(source, 'FAKE/PATH.tsx')).toBe(expected)
    // ensure nothing changes for second purge
    expect(purgeCode(expected, 'FAKE/PATH.tsx')).toBe(expected)
  })

  test.skip('remove a18n.x method', () => {
    const source = `const s15_1 = (
  <>
    {a18n('我喜欢2')}
    <input type="text" placeholder={a18n('这样子2')} />
    <span>{a18n.x\`你有\${(
      <strong>{a18n('很多')}</strong>
      )}封未读邮件\`}</span>
  </>
)`
    const expected = `
    const s15_1 = (
      <>
        我喜欢2
        <input type=\"text\" placeholder='这样子2' />
        <span>你有<strong>很多</strong>封未读邮件</span>
      </>
    )`
    assertEqualFormatted(purgeCode(source, 'FAKE/PATH.tsx'), expected)
    // ensure nothing changes for second purge
    assertEqualFormatted(purgeCode(expected, 'FAKE/PATH.tsx'), expected)
  })

  test.skip('remove a18n.x method 2', () => {
    const source = `
    const s15_1 = (
      <>{a18n.x\`我喜欢\${(<input type="text" placeholder={a18n('这样子')} />)}\`}</>
    )
`
    const expected = `
    const s15_1 = (
      <>
        我喜欢
        <input type="text" placeholder="这样子" />
      </>
    )
 `
    assertEqualFormatted(purgeCode(source, 'FAKE/PATH.tsx'), expected)
    // ensure nothing changes for second purge
    assertEqualFormatted(purgeCode(expected, 'FAKE/PATH.tsx'), expected)
  })

  test.skip('xxxxxxxx', () => {
    const source = `
    const s15_1 = (
      <>{a18n.x\`我喜欢\${(<input type="text" placeholder={a18n('这样子')} />)}\`}</>
    )
`
    const expected = `
    const s15_1 = (
      <>
        我喜欢
        <input type="text" placeholder="这样子" />
      </>
    )
 `
    assertEqualFormatted(purgeCode(source, 'FAKE/PATH.tsx'), expected)
    // ensure nothing changes for second purge
    assertEqualFormatted(purgeCode(expected, 'FAKE/PATH.tsx'), expected)
  })
})
