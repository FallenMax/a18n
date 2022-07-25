import a18n, { getA18n } from '.'

describe('i18n', () => {
  beforeEach(() => {
    a18n.DEBUG_reset()
  })
  afterEach(() => {
    a18n.DEBUG_reset()
  })

  test('static text', async () => {
    a18n.addLocaleResource('custom', {
      'no-translation': null,
      'empty-string': '',
      你好: 'Hello',
    })
    a18n.setLocale('custom')

    expect(a18n('你好')).toEqual('Hello')
    expect(a18n('no-translation')).toEqual('no-translation')
    expect(a18n('non-existed-key')).toEqual('non-existed-key')
    expect(a18n('empty-string')).toEqual('')
    expect(a18n(undefined as any)).toEqual('undefined')
    expect(a18n('')).toEqual('')
    expect(a18n(0 as any)).toEqual('0')
  })

  test('static text: benchmark', async () => {
    a18n.addLocaleResource('en', {
      source: 'target',
    })
    a18n.setLocale('en')

    let found = 0
    let count = 1e6
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (a18n('source') === 'target') {
        found++
      }
    }
    let ms = Date.now() - start
    console.info(`translate ${count} static texts: ${ms}ms`)
    expect(found).toBe(count)
  })

  test('dynamic text', async () => {
    a18n.addLocaleResource('custom', {
      'static key': 'static value',
      'Hello, %s': '你好 %s',
      'Empty%1%2%3': '',
      '%s': 'translated: %s',
      '%1%2': 'translated: %2%1',
      'a%1b%2c': 'translated: c%2b%1a',
      'nothing %s': null,
    })
    a18n.setLocale('custom')

    expect(a18n`static key`).toEqual('static value')
    expect(a18n`Hello, ${'FallenMax'}`).toEqual('你好 FallenMax')
    expect(a18n`Empty${'a'}${'b'}${'c'}`).toEqual('')
    expect(a18n`${'x'}`).toEqual('translated: x')
    expect(a18n`${'x'}${'y'}`).toEqual('translated: yx')
    expect(a18n`a${1}b${2}c`).toEqual('translated: c2b1a')

    expect(a18n``).toEqual('')
    expect(a18n`non-${'existed'}`).toEqual('non-existed')
    expect(a18n`nothing ${'matters'}`).toEqual('nothing matters')
  })

  test('dynamic text: return array', async () => {
    a18n.addLocaleResource('custom', {
      'static key': 'static value',
      'Hello, %s': '你好 %s',
      'Empty%1%2%3': '',
      '%s': 'translated: %s',
      '%1%2': 'translated: %2%1',
      'a%1b%2c': 'translated: c%2b%1a',
      'nothing %s': null,
    })
    a18n.setLocale('custom')

    expect(a18n.x`static key`).toEqual(['static value'])
    expect(a18n.x`Hello, ${'FallenMax'}`).toEqual(['你好 ', 'FallenMax', ''])
    expect(a18n.x`Empty${'a'}${'b'}${'c'}`).toEqual([''])
    expect(a18n.x`${'x'}`).toEqual(['translated: ', 'x', ''])
    expect(a18n.x`${'x'}${'y'}`).toEqual(['translated: ', 'y', '', 'x', ''])
    expect(a18n.x`a${1}b${2}c`).toEqual(['translated: c', 2, 'b', 1, 'a'])

    expect(a18n.x``).toEqual([''])
    expect(a18n.x`non-${'existed'}`).toEqual(['non-', 'existed', ''])
    expect(a18n.x`non-${['some_array']}`).toEqual(['non-', ['some_array'], ''])
    expect(a18n.x`nothing ${{ some: 'object' }}`).toEqual([
      'nothing ',
      { some: 'object' },
      '',
    ])
  })

  test('dynamic text: benchmark', async () => {
    a18n.addLocaleResource('en', {
      'x%1y%2z%3w': 'a%3b%1c',
    })
    a18n.setLocale('en')

    let found = 0
    let count = 1e6
    let start = Date.now()
    for (let index = 0; index < count; index++) {
      if (a18n`x${1}y${2}z${3}w` === 'a3b1c') {
        found++
      }
    }
    let ms = Date.now() - start
    console.info(`translate ${count} dynamic texts: ${ms}ms`)
    expect(found).toBe(count)
  })

  describe('locale / resource', () => {
    test('should support setLocale before addLocaleResource', () => {
      a18n.setLocale('custom')

      a18n.addLocaleResource('custom', {
        x: 'x-translated',
        'x%s': 'x%s-translated',
      })

      expect(a18n('x')).toEqual('x-translated')
      expect(a18n`x${1}`).toEqual('x1-translated')
    })

    test('should support setLocale after addLocaleResource', () => {
      a18n.addLocaleResource('custom', {
        x: 'x-translated',
        'x%s': 'x%s-translated',
      })

      a18n.setLocale('custom')
      expect(a18n('x')).toEqual('x-translated')
      expect(a18n`x${1}`).toEqual('x1-translated')
    })

    test('should support switching locales', () => {
      a18n.addLocaleResource('lang-a', {
        x: 'x-translated-a',
      })
      a18n.addLocaleResource('lang-b', {
        x: 'x-translated-b',
      })

      a18n.setLocale('lang-a')
      expect(a18n('x')).toEqual('x-translated-a')

      a18n.setLocale('lang-b')
      expect(a18n('x')).toEqual('x-translated-b')

      a18n.setLocale('lang-a')
      expect(a18n('x')).toEqual('x-translated-a')
    })

    test('should merge with existing resource, overwritting values with same keys', () => {
      a18n.setLocale('custom')

      a18n.addLocaleResource('custom', {
        x: 'x-translated',
        'x%s': 'x%s-translated',
        y: 'y-translated',
        'y%s': 'y%s-translated',
      })

      a18n.addLocaleResource('custom', {
        x: 'x-translated-modified',
        'x%s': 'x%s-translated-modified',
        z: 'z-translated',
        'z%s': 'z%s-translated',
      })

      expect(a18n('x')).toEqual('x-translated-modified')
      expect(a18n`x${1}`).toEqual('x1-translated-modified')
      expect(a18n('y')).toEqual('y-translated')
      expect(a18n`y${1}`).toEqual('y1-translated')
      expect(a18n('z')).toEqual('z-translated')
      expect(a18n`z${1}`).toEqual('z1-translated')
    })
  })

  describe('namespace', () => {
    test('different namespaces should be isolated (different instance/locale/resource)', () => {
      // namespace a
      {
        const a18n = getA18n('a')

        a18n.addLocaleResource('en', {
          x: 'x-translated',
          'x%s': 'x%s-translated',
          y: 'y-translated',
          'y%s': 'y%s-translated',
        })
        a18n.setLocale('en')
        expect(a18n('x')).toEqual('x-translated')
        expect(a18n`x${1}`).toEqual('x1-translated')
        expect(a18n('y')).toEqual('y-translated')
        expect(a18n`y${1}`).toEqual('y1-translated')
        expect(a18n('z')).toEqual('z')
        expect(a18n`z${1}`).toEqual('z1')
      }

      // namespace b
      {
        const a18n = getA18n('b')
        a18n.addLocaleResource('en', {
          x: 'x-translated-modified',
          'x%s': 'x%s-translated-modified',
          z: 'z-translated',
          'z%s': 'z%s-translated',
        })
        a18n.setLocale('en')
        expect(a18n('x')).toEqual('x-translated-modified')
        expect(a18n`x${1}`).toEqual('x1-translated-modified')
        expect(a18n('y')).toEqual('y')
        expect(a18n`y${1}`).toEqual('y1')
        expect(a18n('z')).toEqual('z-translated')
        expect(a18n`z${1}`).toEqual('z1-translated')
      }

      // namespace a runs again, should be using its own locale/resource
      {
        const a18n = getA18n('a')

        a18n.addLocaleResource('en', {
          x: 'x-translated',
          'x%s': 'x%s-translated',
          y: 'y-translated',
          'y%s': 'y%s-translated',
        })
        a18n.setLocale('en')
        expect(a18n('x')).toEqual('x-translated')
        expect(a18n`x${1}`).toEqual('x1-translated')
        expect(a18n('y')).toEqual('y-translated')
        expect(a18n`y${1}`).toEqual('y1-translated')
        expect(a18n('z')).toEqual('z')
        expect(a18n`z${1}`).toEqual('z1')

        // and changes locale
        a18n.setLocale('jp')
      }

      // namespace b runs again, should be using its own locale/resources
      {
        const a18n = getA18n('b')
        a18n.addLocaleResource('en', {
          x: 'x-translated-modified',
          'x%s': 'x%s-translated-modified',
          z: 'z-translated',
          'z%s': 'z%s-translated',
        })
        a18n.setLocale('en')
        expect(a18n('x')).toEqual('x-translated-modified')
        expect(a18n`x${1}`).toEqual('x1-translated-modified')
        expect(a18n('y')).toEqual('y')
        expect(a18n`y${1}`).toEqual('y1')
        expect(a18n('z')).toEqual('z-translated')
        expect(a18n`z${1}`).toEqual('z1-translated')

        expect(a18n.getLocale()).toBe('en')
      }
    })
  })

  describe('module', () => {
    test('should use translation from correct module', () => {
      const tA = getA18n('ns', 'a')
      const tB = getA18n('ns', 'b')
      const tNoModule = getA18n('ns')

      tA.addLocaleResource('custom', {
        x: 'no-module',
        'x %s': 'no-module %s',
        fallback: 'root fallback',
        a: {
          x: 'a',
          'x %s': 'a %s',
        },
        b: {
          x: 'b',
          'x %s': 'b %s',
        },
      })
      tA.setLocale('custom')

      expect(tNoModule('x')).toEqual('no-module')
      expect(tNoModule`x ${1}`).toEqual('no-module 1')
      expect(tNoModule('no-translation')).toEqual('no-translation')

      expect(tA('x')).toEqual('a')
      expect(tA`x ${1}`).toEqual('a 1')
      expect(tA('no-translation')).toEqual('no-translation')
      expect(tA('fallback')).toEqual('fallback') // should not fallback to root module

      expect(tB('x')).toEqual('b')
      expect(tB`x ${1}`).toEqual('b 1')
      expect(tB('no-translation')).toEqual('no-translation')
    })
  })

  describe('DEBUG_reset', () => {
    test('can be resetted', () => {
      const noNs = a18n
      noNs.addLocaleResource('en', { x: 'y-noNs' })
      noNs.setLocale('en')

      const a = a18n.getA18n('a')
      a.addLocaleResource('en', { x: 'y-a' })
      a.setLocale('en')

      const b = a18n.getA18n('b')
      b.addLocaleResource('en', { x: 'y-b' })
      b.setLocale('en')

      expect(noNs('x')).toBe('y-noNs')
      expect(a('x')).toBe('y-a')
      expect(b('x')).toBe('y-b')

      a.DEBUG_reset()

      expect(noNs('x')).toBe('x')
      expect(a('x')).toBe('x')
      expect(b('x')).toBe('x')
    })
  })

  describe('DEBUG_setRepeat', () => {
    test('can set repeat count', () => {
      a18n.addLocaleResource('en', {
        'not translated': null,
        'static text': 'static text translated',
        'dynamic %s': 'dynamic %s translated',
        'dynamic %s not translated': '',
      })
      a18n.setLocale('en')
      a18n.DEBUG_setRepeat(2)

      expect(a18n('not translated')).toBe('not translated not translated')
      expect(a18n('not exist')).toBe('not exist not exist')
      expect(a18n('static text')).toBe(
        'static text translated static text translated',
      )
      expect(a18n`dynamic ${1}`).toBe(
        `dynamic 1 translated dynamic 1 translated`,
      )
      expect(a18n`dynamic ${2} untranslated`).toBe(
        `dynamic 2 untranslated dynamic 2 untranslated`,
      )
      expect(a18n.x`dynamic ${1}`).toEqual([
        `dynamic `,
        1,
        ' translated',
        ' ',
        `dynamic `,
        1,
        ' translated',
      ])

      expect(a18n.x`dynamic ${1} untranslated`).toEqual([
        `dynamic `,
        1,
        ' untranslated',
        ' ',
        `dynamic `,
        1,
        ' untranslated',
      ])

      a18n.DEBUG_setRepeat(3, '*')

      expect(a18n('not translated')).toBe(
        'not translated*not translated*not translated',
      )
      expect(a18n.x`dynamic ${1}`).toEqual([
        `dynamic `,
        1,
        ' translated',
        '*',
        `dynamic `,
        1,
        ' translated',
        '*',
        `dynamic `,
        1,
        ' translated',
      ])
    })
  })
})
