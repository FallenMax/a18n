import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { sourceTextToKey } from './source_to_key'
import { needTranslate, wrapCode as wrap } from './wrap/tsx-wrapper'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const wrapCode = (...args: Parameters<typeof wrap>) => wrap(...args).output

const assertEqualFormated = (a: string, b: string) => {
  expect(format(a)).toBe(format(b))
}

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
    const sourcePath = resolve(
      __dirname,
      '../../src/cli/__test__/wrap-input.mock.tsx',
    )
    const source = readFileSync(sourcePath, { encoding: 'utf-8' })
    const expectedPath = resolve(
      __dirname,
      '../../src/cli/__test__/wrap-output.mock.tsx',
    )
    const expected = readFileSync(expectedPath, { encoding: 'utf-8' })

    assertEqualFormated(
      wrapCode(source, { namespace: undefined, filePath: sourcePath }),
      expected,
    )
    // ensure we don't double wrap a18n()
    assertEqualFormated(
      wrapCode(expected, { namespace: undefined, filePath: sourcePath }),
      expected,
    )
  })

  describe('add a18n.x() calls for jsx', () => {
    test('wrap multiple text elements using a18n.x', () => {
      const source = `const a = <div>你好，<strong>{userName}</strong>!</div>`
      const expected = `import a18n from "a18n"; const a = <div>{a18n.x\`你好，\${(<strong>{userName}</strong>)}!\`}</div>`

      assertEqualFormated(
        wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormated(
        wrapCode(expected, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
    })
    test(`don't wrap single text element using a18n.x`, () => {
      const source = `const a = <div>
          你好，
          <strong>{userName}</strong>
      </div>` // note the missing '!'
      const expected = `import a18n from "a18n"; const a = <div>
        {a18n("你好，")}
        <strong>{userName}</strong>
      </div>`

      assertEqualFormated(
        wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormated(
        wrapCode(expected, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
    })
  })

  test('returns unwrapped "sourceTexts" when checkOnly=true', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-input.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const { sourceTexts } = wrap(source, {
      checkOnly: true,
      filePath: 'FAKE/PATH.tsx',
    })
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
      '我喜欢%s生活',
      '这样子',
      '我喜欢2',
      '这样子2',
      '中文3',
      '你好\n世界',
      '你好\n%s',
      '世界',
    ])
  })

  test('returns unwrapped "sourceTexts" when checkOnly=true: a18n.x', () => {
    const source = `const s15 = (
      <div>
        我喜欢
        <input type="text" placeholder="这样子" />
        生活
      </div>
    )`
    const { sourceTexts } = wrap(source, {
      checkOnly: true,
      filePath: 'FAKE/PATH.tsx',
    })
    const keys = sourceTexts.map(sourceTextToKey)
    expect(keys).toEqual(['我喜欢%s生活', '这样子'])
  })

  test('igore file containing `@a18n-ignore-file` ', () => {
    const source = `// @a18n-ignore-file

  const s = '中文'
  `

    const expected = `// @a18n-ignore-file

  const s = '中文'
  `

    assertEqualFormated(
      wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
      expected,
    )

    // ensure we don't double wrap a18n()
    assertEqualFormated(
      wrapCode(expected, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
      expected,
    )
  })

  describe('add import statement: without namespace', () => {
    test(`don't add if not needed`, () => {
      assertEqualFormated(
        wrapCode(`const s = 'english'`, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
        }),
        `const s = 'english'`,
      )
    })

    test('add import statement', () => {
      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
        }),
        `import a18n from 'a18n'
const s = a18n('中文')`,
      )
    })

    test(`don't add import statement if existed`, () => {
      assertEqualFormated(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined, filePath: 'FAKE/PATH.tsx' },
        ),
        `import a18n from 'a18n'
const s = a18n('中文')`,
      )
    })
    test(`don't unnecessarily change existed import statement`, () => {
      assertEqualFormated(
        wrapCode(
          `import * as React from 'react'
import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined, filePath: 'FAKE/PATH.tsx' },
        ),
        `import * as React from 'react'
import a18n from 'a18n'
const s = a18n('中文')`,
      )
    })

    test(`add require() if code base is using require()`, () => {
      assertEqualFormated(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: undefined, filePath: 'FAKE/PATH.tsx' },
        ),
        `const a18n = require('a18n')
const React = require('react')
const s = a18n('中文')`,
      )
    })
  })

  describe('add import statement: with namespace', () => {
    test("don't need import/require", () => {
      assertEqualFormated(
        wrapCode(`const s = 'english'`, {
          namespace: 'my-namespace',
          filePath: 'FAKE/PATH.tsx',
        }),
        `const s = 'english'`,
      )
    })

    test(`add import`, () => {
      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          filePath: 'FAKE/PATH.tsx',
        }),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
      )
    })

    test(`replace import: replace non-namespaced a18n`, () => {
      assertEqualFormated(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: 'my-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
      )
    })

    test(`replace import: replace namespaced a18n`, () => {
      assertEqualFormated(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
      )
    })

    test(`retain import: don't make unnecessary change`, () => {
      assertEqualFormated(
        wrapCode(
          `import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'your-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
      )
    })

    test(`add require`, () => {
      assertEqualFormated(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: 'my-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const React = require('react')
const s = a18n('中文')`,
      )
    })

    test(`replace require: replace non-namespaced a18n`, () => {
      assertEqualFormated(
        wrapCode(
          `const a18n = require('a18n')
const s = '中文'`,
          { namespace: 'my-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
      )
    })

    test(`replace require: replace namespaced a18n`, () => {
      assertEqualFormated(
        wrapCode(
          `const { getA18n } = require('a18n')
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace', filePath: 'FAKE/PATH.tsx' },
        ),
        `const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`,
      )
    })
  })
  describe('module', () => {
    test(`add moduleName from filePath`, () => {
      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'filePath',
          filePath: '/root/a/b/c/foo.ts',
          basePath: '/root',
        }),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'a/b/c/foo')
const s = a18n('中文')`,
      )
    })

    test(`add moduleName from fileDirAndName`, () => {
      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'fileDirAndName',
          filePath: '/root/a/b/c/foo.ts',
          basePath: '/root',
        }),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'c/foo')
const s = a18n('中文')`,
      )

      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'fileDirAndName',
          filePath: '/root/foo.ts',
          basePath: '/root',
        }),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`,
      )
    })

    test(`add moduleName from fileName (first-time)`, () => {
      assertEqualFormated(
        wrapCode(`const s = '中文'`, {
          namespace: 'my-namespace',
          moduleName: 'fileName',
          filePath: '/root/a/b/c/foo.ts',
          basePath: '/root',
        }),
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`,
      )
    })

    test(`add moduleName from fileName (already have namespace)`, () => {
      assertEqualFormated(
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
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`,
      )
    })

    test(`keep current moduleName (--module-name-update=false)`, () => {
      assertEqualFormated(
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
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'bar')
const s = a18n('中文')`,
      )
    })

    test(`update current moduleName (--module-name-update=true)`, () => {
      assertEqualFormated(
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
        `import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace', 'foo')
const s = a18n('中文')`,
      )
    })
  })
})
