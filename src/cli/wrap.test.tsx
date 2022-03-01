import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { sourceTextToKey } from './source_to_key'
import { needTranslate, wrapCode as wrap } from './wrap/tsx-wrapper'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const wrapCode = (...args: Parameters<typeof wrap>) => wrap(...args).output

describe('wrap', () => {
  test('needTranslate() should return true for non-ascii words and sentences', () => {
    const n = needTranslate
    expect(n('')).toBe(false)
    expect(n(' ')).toBe(false)
    expect(n('\t')).toBe(false)
    expect(n('      ')).toBe(false) // nbsp
    expect(n(' \n ')).toBe(false)
    expect(n('some')).toBe(false)
    expect(n('some thing')).toBe(false)
    expect(n('+-*/!@#$%^&*()_+|-=`~[]{};\':",./<>?')).toBe(false)
    expect(n('abc')).toBe(false)
    expect(n(';:`')).toBe(false)
    expect(n('☺')).toBe(false)
    expect(n('⏰')).toBe(false)
    expect(n('我')).toBe(true)
    expect(n('。')).toBe(true)
    expect(n('⌘')).toBe(false)
  })
  test('add a18n() calls ', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-input.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const expected = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-output.mock.tsx'),
      { encoding: 'utf-8' },
    )

    expect(format(wrapCode(source, { namespace: undefined }))).toBe(
      format(expected),
    )
    // ensure we don't double wrap a18n()
    expect(wrapCode(expected, { namespace: undefined })).toBe(expected)
  })

  test('returns unwrapped "sourceTexts" when checkOnly=true', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-input.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const { sourceTexts } = wrap(source, { checkOnly: true })
    const keys = sourceTexts.map(sourceTextToKey)
    expect(keys).toEqual([
      '中文',
      '中文',
      '中文2',
      '中文22',
      'eng 中间有中文 lish',
      '中文%s',
      '星期%s',
      '周%s',
      '我喜欢',
      '这样子',
      '生活',
      '我喜欢',
      '这样子',
      '中文3',
    ])
  })

  test('igore file containing `@a18n-ignore-file` ', () => {
    const source = `// @a18n-ignore-file

  const s = '中文'
  `

    const expected = `// @a18n-ignore-file

  const s = '中文'
  `

    expect(wrapCode(source, { namespace: undefined })).toBe(expected)

    // ensure we don't double wrap a18n()
    expect(wrapCode(expected, { namespace: undefined })).toBe(expected)
  })

  describe('add import statement: without namespace', () => {
    test(`don't add if not needed`, () => {
      expect(wrapCode(`const s = 'english'`, { namespace: undefined })).toBe(
        `const s = 'english'`,
      )
    })

    test('add import statement', () => {
      expect(wrapCode(`const s = '中文'`, { namespace: undefined }))
        .toBe(`import a18n from 'a18n'
const s = a18n('中文')`)
    })

    test(`don't add import statement if existed`, () => {
      expect(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`import a18n from 'a18n'
const s = a18n('中文')`)
    })
    test(`don't unnecessarily change existed import statement`, () => {
      expect(
        wrapCode(
          `import * as React from 'react'
import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`import * as React from 'react'
import a18n from 'a18n'
const s = a18n('中文')`)
    })

    test(`add require() if code base is using require()`, () => {
      expect(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`const a18n = require('a18n')
const React = require('react')
const s = a18n('中文')`)
    })
  })

  describe('add import statement: with namespace', () => {
    test("don't need import/require", () => {
      expect(
        wrapCode(`const s = 'english'`, { namespace: 'my-namespace' }),
      ).toBe(`const s = 'english'`)
    })

    test(`add import`, () => {
      expect(wrapCode(`const s = '中文'`, { namespace: 'my-namespace' }))
        .toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace import: replace non-namespaced a18n`, () => {
      expect(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace import: replace namespaced a18n`, () => {
      expect(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`retain import: don't make unnecessary change`, () => {
      expect(
        wrapCode(
          `import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'your-namespace' },
        ),
      ).toBe(`import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`)
    })

    test(`add require`, () => {
      expect(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const React = require('react')
const s = a18n('中文')`)
    })

    test(`replace require: replace non-namespaced a18n`, () => {
      expect(
        wrapCode(
          `const a18n = require('a18n')
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace require: replace namespaced a18n`, () => {
      expect(
        wrapCode(
          `const { getA18n } = require('a18n')
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })
  })
  describe('module', () => {
    test(`add moduleName from filePath`, () => {
      expect(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'filePath',
          filePath: '/root/a/b/c/foo.ts',
          basePath: '/root',
        }),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'a/b/c/foo')
const s = a18n('中文')`)
    })

    test(`add moduleName from fileName (first-time)`, () => {
      expect(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'fileName',
          filePath: '/root/a/b/c/foo.ts',
          basePath: '/root',
        }),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`)
    })

    test(`add moduleName from fileName (already have namespace)`, () => {
      expect(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
          {
            namespace: 'my-namespace',
            moduleName: 'fileName',
            filePath: '/root/a/b/c/foo.ts',
            basePath: '/root',
          },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`)
    })

    test(`keep current moduleName (without --module-name-update)`, () => {
      expect(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'bar')
const s = a18n('中文')`,
          {
            namespace: 'my-namespace',
            moduleName: 'fileName',
            moduleNameUpdate: false,
            filePath: '/root/a/b/c/foo.ts',
            basePath: '/root',
          },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'bar')
const s = a18n('中文')`)
    })

    test(`update current moduleName (with --module-name-update)`, () => {
      expect(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'bar')
const s = a18n('中文')`,
          {
            namespace: 'my-namespace',
            moduleName: 'fileName',
            moduleNameUpdate: true,
            filePath: '/root/a/b/c/foo.ts',
            basePath: '/root',
          },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`)
    })
  })
})
