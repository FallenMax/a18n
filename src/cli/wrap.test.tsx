import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { sourceTextToKey } from './source_to_key'
import { needTranslate, wrapCode as wrap } from './wrap/tsx-wrapper'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const wrapCode = (...args: Parameters<typeof wrap>) => wrap(...args).output

const assertEqualFormatted = (a: string, b: string) => {
  expect(format(a)).toBe(format(b))
}

describe('wrap', () => {
  describe('needTranslate', () => {
    test('when text=cjk, it should return true for non-ascii words and sentences', () => {
      const n = (str: string) => needTranslate(str, 'cjk')
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
    test('when text=prefix, it should return true for text starts with PREFIX', () => {
      const n = (str: string) => needTranslate(str, 'prefix')
      expect(n('')).toBe(false)
      expect(n('@')).toBe(false)
      expect(n('@@')).toBe(true)
      expect(n('@@text')).toBe(true)
      expect(n(' @@text')).toBe(true)
      expect(
        n(` 
      @@text`),
      ).toBe(true)
      expect(n('我')).toBe(false)
    })
    test('when text=capitalized, it should return true for text starts with capitalized letter', () => {
      const n = (str: string) => needTranslate(str, 'capitalized')
      expect(n('')).toBe(false)
      expect(n('a')).toBe(false)
      expect(n('A')).toBe(true)
      expect(n('A text')).toBe(true)
      expect(n(' a text')).toBe(false)
      expect(
        n(` 
      A text`),
      ).toBe(true)
      expect(n('我')).toBe(false)
    })
  })
  describe('add a18n() calls ', () => {
    test('when text=cjk, wrap cjk texts, handles all syntaxes correctly', () => {
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

      assertEqualFormatted(
        wrapCode(source, { namespace: undefined, filePath: sourcePath }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormatted(
        wrapCode(expected, { namespace: undefined, filePath: sourcePath }),
        expected,
      )
    })
    test('when text=prefix, wrap texts with special prefix', () => {
      const source = `
      const staticText = '@@Hello @@world'
      const dynamicText = \`@@Hello \${'@@world'}\`
      const singleJsx = <div>@@Hello world</div>
      const multipleJsx = <div>
        @@Hello <strong>@@world</strong>!
      </div>
  `
      const expected = `
      import a18n from "a18n";

      const staticText = a18n("Hello @@world");
      const dynamicText = a18n\`Hello \${a18n("world")}\`;
      const singleJsx = <div>{a18n("Hello world")}</div>;
      const multipleJsx = (
      <div>{a18n.x\`Hello\${(<strong>{a18n("world")}</strong>)}!\`}</div>
    );
    `

      assertEqualFormatted(
        wrapCode(source, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
          text: 'prefix',
        }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormatted(
        wrapCode(expected, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
          text: 'prefix',
        }),
        expected,
      )
    })
    test('when text=capitalized, wrap capitalized texts', () => {
      const source = `
      const staticText = 'Hello World'
      const dynamicText = \`Hello \${'world'}\`
      const singleJsx = <div>Hello world</div>
      const multipleJsx = <div>
        Hello <strong>world</strong>!
      </div>
  `
      const expected = `
      import a18n from "a18n";

      const staticText = a18n('Hello World');
      const dynamicText = a18n\`Hello \${'world'}\`;
      const singleJsx = <div>{a18n('Hello world')}</div>;
      const multipleJsx = (
      <div>{a18n.x\`Hello\${(<strong>world</strong>)}!\`}</div>
    );
    `
      assertEqualFormatted(
        wrapCode(source, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
          text: 'capitalized',
        }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormatted(
        wrapCode(expected, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
          text: 'capitalized',
        }),
        expected,
      )
    })
  })

  describe('add a18n.x() calls for jsx', () => {
    test('wrap multiple text elements using a18n.x', () => {
      const source = `const a = <div>你好，<strong>{userName}</strong>!</div>`
      const expected = `import a18n from "a18n"; const a = <div>{a18n.x\`你好，\${(<strong>{userName}</strong>)}!\`}</div>`

      assertEqualFormatted(
        wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormatted(
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

      assertEqualFormatted(
        wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
        expected,
      )
      // ensure we don't double wrap a18n()
      assertEqualFormatted(
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

  test('ignore file containing `@a18n-ignore-file` ', () => {
    const source = `// @a18n-ignore-file

  const s = '中文'
  `

    const expected = `// @a18n-ignore-file

  const s = '中文'
  `

    assertEqualFormatted(
      wrapCode(source, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
      expected,
    )

    // ensure we don't double wrap a18n()
    assertEqualFormatted(
      wrapCode(expected, { namespace: undefined, filePath: 'FAKE/PATH.tsx' }),
      expected,
    )
  })

  describe('add import statement: without namespace', () => {
    test(`don't add if not needed`, () => {
      assertEqualFormatted(
        wrapCode(`const s = 'english'`, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
        }),
        `const s = 'english'`,
      )
    })

    test('add import statement', () => {
      assertEqualFormatted(
        wrapCode(`const s = '中文'`, {
          namespace: undefined,
          filePath: 'FAKE/PATH.tsx',
        }),
        `import a18n from 'a18n'
const s = a18n('中文')`,
      )
    })

    test(`don't add import statement if existed`, () => {
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
        wrapCode(`const s = 'english'`, {
          namespace: 'my-namespace',
          filePath: 'FAKE/PATH.tsx',
        }),
        `const s = 'english'`,
      )
    })

    test(`add import`, () => {
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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

      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
      assertEqualFormatted(
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
