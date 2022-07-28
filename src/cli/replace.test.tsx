import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { LocaleResource } from '../types'
import { extractCode } from './extract/tsx-extractor'
import { replaceCode as replace } from './replace/tsx-replacer'
import { sourceTextToKey } from './source_to_key'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const replaceCode = (...args: Parameters<typeof replace>) =>
  replace(...args).output

const assertEqualFormatted = (a: string, b: string) => {
  expect(format(a)).toBe(format(b))
}

describe('replace', () => {
  test('replace texts inside a18n() calls ', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-output.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const expected = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/replace-output.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const sourceTexts = extractCode(source, 'FAKE_PATH')
    const keys = sourceTexts.map((t) => sourceTextToKey(t))
    const values = keys.map((k) => k + '-1') // no special meaning of `-1`, just create a predicatable value for each key
    const resource = {} as LocaleResource
    keys.forEach((key, i) => {
      resource[key] = values[i]
    })

    assertEqualFormatted(
      replaceCode(source, {
        locale: 'zh-CN', // not used, so just pass anything
        resource,
      }),
      expected,
    )
  })
  test('replace texts using module resource', () => {
    assertEqualFormatted(
      replaceCode(
        `
const a18n = getA18n('my-ns', 'x')
const a = a18n('a')
const b = a18n\`b\${1}\`
const c = a18n.x\`b\${1}\`
  `,
        {
          locale: 'zh-CN', // not used, so just pass anything
          resource: {
            a: 'a_',
            'b%s': 'b%s_',
            x: {
              a: 'ax',
              'b%s': 'b%sx',
            },
            y: {
              a: 'ay',
              'b%s': 'b%sy',
            },
          },
        },
      ),
      `
const a18n = getA18n('my-ns', 'x')
const a = a18n('ax')
const b = a18n\`b\${1}x\`
const c = a18n.x\`b\${1}x\`
  `,
    )
  })
  test.todo('replace texts: should not replace more than once')
  // () => {
  //   const source = `
  //   a18n('a')
  //   a18n('b')
  //   `
  //   const resource = {
  //     a: 'b',
  //     b: 'c',
  //   }
  //   const expected = `
  //   a18n('b')
  //   a18n('c')
  //   `

  //   expect(
  //     format(
  //       replaceCode(source, {
  //         locale: 'zh-CN', // not used, so just pass anything
  //         resource,
  //       }),
  //     ),
  //   ).toBe(format(expected))
  // }

  test.todo('replace texts: handle escaped backtick correctly')
  // () => {
  //   const resource = {
  //     '`a\\`': '`b\\`',
  //   }
  // }
})
