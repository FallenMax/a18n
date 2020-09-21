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
      'Hello, %s': '你好 %s',
      'Empty%1%2%3': '',
      '%s': 'translated: %s',
      '%1%2': 'translated: %2%1',
      'a%1b%2c': 'translated: c%2b%1a',
      'nothing %s': null,
    })
    a18n.setLocale('custom')

    expect(a18n`Hello, ${'FallenMax'}`).toEqual('你好 FallenMax')
    expect(a18n`Empty${'a'}${'b'}${'c'}`).toEqual('')
    expect(a18n`${'x'}`).toEqual('translated: x')
    expect(a18n`${'x'}${'y'}`).toEqual('translated: yx')
    expect(a18n`a${1}b${2}c`).toEqual('translated: c2b1a')

    expect(a18n``).toEqual('')
    expect(a18n`non-${'existed'}`).toEqual('non-existed')
    expect(a18n`nothing ${'matters'}`).toEqual('nothing matters')
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
    test('different namespaces are isolated', () => {
      // module a
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

      // module b
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

      // module a runs again, should be using its own locale/resource
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

      // module b runs again, should be using its own locale/resources
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
})
