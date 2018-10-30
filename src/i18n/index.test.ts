import a18n, { getA18n } from '.'

describe('i18n', () => {
  beforeEach(() => {
    a18n.DEBUG_reset()
  })
  afterEach(() => {
    a18n.DEBUG_reset()
  })

  test('a18n(staticText)', async () => {
    a18n.addLocaleResource('en', {
      这句话没有翻译: null,
      '这句话翻译翻译了，但是为空字符串': '',
      // 这句话也没有: undefined
      表格做的真好: 'nufan is cool',
    })
    a18n.setLocale('en')

    expect(a18n('没有这个翻译')).toEqual('没有这个翻译')
    expect(a18n('这句话没有翻译')).toEqual('这句话没有翻译')
    expect(a18n('这句话翻译翻译了，但是为空字符串')).toEqual('')
    expect(a18n('这句话也没有')).toEqual('这句话也没有')
    expect(a18n('表格做的真好')).toEqual('nufan is cool')
    expect(a18n(undefined as any)).toEqual('')
    expect(a18n('')).toEqual('')
    expect(a18n``).toEqual('')
    expect(a18n`${undefined}`).toEqual('undefined')
    expect(a18n(0 as any)).toEqual('')
  })

  test('a18n(staticText, {_: "some.id"})', async () => {
    a18n.addLocaleResource('en', {
      'hi#short.greeting': '早1',
    })
    a18n.setLocale('en')

    // 测试以ID为key
    expect(a18n('hi', { _: 'short.greeting' })).toEqual('早1')
    expect(a18n('hi')).toEqual('hi')
    // text不对
    expect(a18n('ho', { _: 'short.greeting' })).toEqual('ho')
    // id不对
    expect(a18n('hi', { _: 'short.greeting2' })).toEqual('hi')
    // 都不对
    expect(a18n('h0', { _: 'short.greeting2' })).toEqual('h0')
  })

  test('a18n`dynamic ${texts}`', async () => {
    a18n.addLocaleResource('en', {
      // 这句话${也}没有: undefined
      '%s是最棒的': 'nufan is way better than %s',
    })
    a18n.setLocale('en')

    expect(a18n`这句话${'也'}没有`).toEqual('这句话也没有')
    expect(a18n`${'小明'}是最棒的`).toEqual('nufan is way better than 小明')
  })

  test('setLocale', () => {
    a18n.setLocale('en')

    a18n.addLocaleResource('en', { added: '额外添加', added1: '额外添加1' })

    a18n.addLocaleResource('en', {
      added: '额外添加·改',
      added2: '额外添加2',
    })

    expect(a18n('added')).toEqual('额外添加·改')
    expect(a18n('added1')).toEqual('额外添加1')
    expect(a18n('added2')).toEqual('额外添加2')
  })

  test('single instance, multiple namespaces', () => {
    // module a
    {
      const a18n = getA18n('a')

      a18n.addLocaleResource('en', { 苹果: 'apple', 梨子: 'pear' })
      a18n.setLocale('en')
      expect(a18n('苹果')).toEqual('apple')
      expect(a18n('梨子')).toEqual('pear')
      expect(a18n('香蕉')).toEqual('香蕉')
    }

    // module b
    {
      const a18n = getA18n('b')
      a18n.addLocaleResource('en', { 苹果: 'not apple', 香蕉: 'banana' })
      a18n.setLocale('en')
      expect(a18n('苹果')).toEqual('not apple')
      expect(a18n('梨子')).toEqual('梨子')
      expect(a18n('香蕉')).toEqual('banana')
    }

    // module a runs again, using its locale resource...
    {
      const a18n = getA18n('a')
      expect(a18n('苹果')).toEqual('apple')
      expect(a18n('梨子')).toEqual('pear')
      expect(a18n('香蕉')).toEqual('香蕉')

      // ...and changes locale
      a18n.setLocale('jp')
    }

    // module b runs again, using its locale and resources
    {
      const a18n = getA18n('b')
      expect(a18n('苹果')).toEqual('not apple')
      expect(a18n('梨子')).toEqual('梨子')
      expect(a18n('香蕉')).toEqual('banana')
    }
  })
})
