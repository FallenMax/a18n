import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { LocaleResource } from '../types'
import { sourceTextToKey } from '../util/locale'
import { extractCode } from './extract/tsx-extractor'
import { replaceCode as replace } from './replace/tsx-replacer'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const replaceCode = (...args: Parameters<typeof replace>) =>
  replace(...args).output

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

    expect(
      format(
        replaceCode(source, {
          locale: 'zh-CN', // not used, so just pass anything
          resource,
        }),
      ),
    ).toBe(format(expected))
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