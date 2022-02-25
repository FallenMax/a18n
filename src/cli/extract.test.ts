import { readFileSync } from 'fs'
import { resolve } from 'path'
import { sourceTextToKey } from '../util/locale'
import { createResource, exporters, importers, toSourceText } from './extract'
import { extractCode } from './extract/tsx-extractor'

describe('extract', () => {
  const filePath = resolve(
    __dirname,
    '../../src/cli/__test__/extract-input.mock.tsx',
  )
  const source = readFileSync(filePath, { encoding: 'utf-8' })

  const extracted = extractCode(source, filePath)

  test('extract source text to key', () => {
    const expected = [
      '中文',
      '中文%s',
      '中文%s2',
      '你有%s封未读邮件',
      '%1中文%2中文2%3',
      '%1中文%2中文2%3中文3',
      '没有插值但用了backtick',
      '"无效名称"错误。无法识别公式中的文本。',
      '我喜欢',
      '这样子',
      '我喜欢2',
      '这样子2',
    ]

    const keys = extracted.map(sourceTextToKey)

    expect(keys.sort()).toEqual(expected.sort())
  })

  test('extract source key with correct module', () => {
    const extracted = extractCode(
      `import { getA18n } from 'a18n'
const a18n = getA18n('my-ns', 'my/module')
const s = a18n('中文')`,
      '/mock/file.tsx',
    )
    expect(extracted).toEqual([
      {
        type: 'string',
        text: '中文',
        context: {
          path: '/mock/file.tsx',
          line: 3,
          column: 10,
          text: undefined,
          module: 'my/module',
        },
      },
    ])
  })

  describe('createResource', () => {
    test('reuseFrom=no', () => {
      expect(
        createResource({
          sourceTexts: toSourceText({
            a: null,
            x: {
              a: null,
            },
          }),
          old: { a: 'a_', x: { a: 'a_' } },
          reuseFrom: 'no',
        }),
      ).toEqual({
        a: null,
        x: {
          a: null,
        },
      })
    })

    test('reuseFrom=same-module-then-root', () => {
      expect(
        createResource({
          sourceTexts: toSourceText({
            d: null,
            x: {
              a: null,
              b: null,
              c: null,
            },
          }),
          old: {
            b: 'b',
            d: 'd',
            x: {
              a: 'xa',
            },
            y: {
              c: 'yc',
            },
          },
          reuseFrom: 'same-module-then-root',
        }),
      ).toEqual({
        d: 'd',
        x: {
          a: 'xa',
          b: 'b',
          c: null,
        },
      })
    })

    test('reuseFrom=same-module', () => {
      expect(
        createResource({
          sourceTexts: toSourceText({
            d: null,
            x: {
              a: null,
              b: null,
              c: null,
            },
          }),
          old: {
            b: 'b',
            d: 'd',
            x: {
              a: 'xa',
            },
            y: {
              c: 'yc',
            },
          },
          reuseFrom: 'same-module',
        }),
      ).toEqual({
        d: 'd',
        x: {
          a: 'xa',
          b: null,
          c: null,
        },
      })
    })

    test('reuseFrom=all', () => {
      expect(
        createResource({
          sourceTexts: toSourceText({
            d: null,
            c: 'c',
            x: {
              a: null,
              b: null,
              c: null,
            },
          }),
          old: {
            b: 'b',
            d: 'd',
            unused: 'unused',
            x: {
              a: 'xa',
              unused: 'unused',
            },
            y: {
              c: 'yc',
              b: 'yb',
            },
          },
          reuseFrom: 'all',
        }),
      ).toEqual({
        d: 'd',
        c: 'yc',
        x: {
          a: 'xa',
          b: 'b',
          c: 'yc',
        },
      })
    })

    test('reuseFrom=all, keepUnused', () => {
      expect(
        createResource({
          sourceTexts: toSourceText({
            d: null,
            x: {
              a: null,
              b: null,
              c: null,
            },
          }),
          old: {
            b: 'b',
            d: 'd',
            unused: 'unused',
            x: {
              a: 'xa',
              unused: 'unused',
            },
            y: {
              c: 'yc',
            },
          },
          reuseFrom: 'all',
          keepUnused: true,
        }),
      ).toEqual({
        b: 'b',
        d: 'd',
        unused: 'unused',
        x: {
          a: 'xa',
          b: 'b',
          c: 'yc',
          unused: 'unused',
        },
        y: {
          c: 'yc',
        },
      })
    })
  })

  test('format: json', () => {
    const expected = [
      '中文',
      '中文%s',
      '中文%s2',
      '你有%s封未读邮件',
      '%1中文%2中文2%3',
      '%1中文%2中文2%3中文3',
      '没有插值但用了backtick',
      '"无效名称"错误。无法识别公式中的文本。',
      '我喜欢',
      '这样子',
      '我喜欢2',
      '这样子2',
    ]

    const exported = exporters.json(
      createResource({
        sourceTexts: extracted,
        old: { 中文: 'Chinese' },
      }),
    )
    const imported = importers.json(exported)

    expect(imported['中文']).toEqual('Chinese')
    expect(Object.keys(imported).sort()).toEqual(expected.sort())
  })
})
