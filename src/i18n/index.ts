import { LocaleResource } from '../types'
import { clearCompileCache, compile, DEBUG_getCompileCache } from './translator'

//-------------- Types --------------

export interface A18n {
  /**
   * translate static text
   *
   * @example
   * ```js
   * a18n("Good morning")
   * ```
   */
  (text: string): string

  /**
   * translate interpolated text (using ES6 Tagged Template syntax),
   *
   * @example
   * ```js
   * a18n`Hello ${userName}`
   * ```
   */
  (parts: TemplateStringsArray, ...values: (string | number)[]): string

  /**
   * translate interpolated text into an array (using ES6 Tagged Template syntax),
   *
   * difference with a18n`some{value}`: dynamic parts can be of any type and will be kept as-is in returned array.
   * this makes translating styled text easier, see example.
   *
   * @example
   * ```jsx
   * a18n.addLocaleResource('zh-CN', { 'Hello %s': '你好 %s'})
   * a18n.setLocale('zh-CN')
   *
   * const greeting = <div>Hello <strong>Jimmy<strong></div>
   *
   * // after manually add a18n.x`` or modify auto wrapped code:
   * const greeting = <div>{a18n.x`Hello ${<strong>Jimmy<strong>}`}</div>
   *
   * // will evaluate to:
   * // <div>你好 <strong>Jimmy<strong></div>
   * ```
   */
  x(parts: TemplateStringsArray, ...values: any[]): any[]

  /**
   * add resource for a language
   *
   * will merge with existed resource, value of same key will be overwritten
   */
  addLocaleResource(locale: string, resource: LocaleResource): void

  /**
   * set current language
   */
  setLocale(locale: string): void

  /**
   * get current language
   */
  getLocale(): string

  /**
   * get a instance for specified namespace
   *
   * resources of different namespaces are isolated
   */
  getA18n(namespace: string): A18n

  /** reset current instance */
  DEBUG_reset(resetSelfOnly?: boolean): void

  DEBUG_print(): void
}

const DEFAULT_NAMESPACE = '__default_namespace__'
// @ts-ignore
const langs = typeof navigator !== 'undefined' ? navigator.languages || [] : []
const DEFAULT_LOCALE = langs[0] || 'en-US'

const ROOT = '__$a18n-instances'

declare var window: any
/** globalThis */
const _global =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
    ? global
    : (() => {
        console.warn(
          '[a18n] cannot resolve globalThis, sharing by namespace is disabled',
        )
        return {}
      })()

type A18nInstances = {
  [K: string]: A18n
}
let globalInstances: A18nInstances = _global[ROOT] || (_global[ROOT] = {})
let localInstances: A18nInstances = {}

const getA18n = (namespace: string): A18n => {
  return globalInstances[namespace] || (globalInstances[namespace] = create())
}

const create = (): A18n => {
  let currentLocale = DEFAULT_LOCALE
  let resources: { [K: string]: LocaleResource } = {
    [currentLocale]: {},
  }
  /** must always be a reference to resources, `addLocaleResource` depend on this  */
  let resource: LocaleResource = resources[currentLocale]

  const addLocaleResource: A18n['addLocaleResource'] = (locale, res) => {
    if (!resources[locale]) {
      resources[locale] = {}
    }

    Object.assign(resources[locale], res)
    clearCompileCache()
  }

  const setLocale: A18n['setLocale'] = (locale: string) => {
    if (typeof locale !== 'string') {
      throw new TypeError(`'locale' is expect to be a string`)
    }
    currentLocale = locale
    if (!resources[currentLocale]) {
      resources[currentLocale] = {}
    }
    resource = resources[currentLocale]
    clearCompileCache()
  }

  function a18n(text: any): string {
    if (typeof text === 'string') {
      const translated = resource[text]
      if (typeof translated === 'string') {
        return translated
      }
      return text
    }

    if (text && typeof text.length === 'number') {
      if (text.length === 1) {
        // shortcut for a18n`statictext`, due to misusage
        return a18n(text[0])
      }
      const template = compile(text, resource)
      const args = arguments

      let result = ''
      for (let index = 0; index < template.length; index++) {
        const item = template[index]
        result += typeof item === 'number' ? String(args[item]) : item
      }
      return result
    }

    console.warn('[a18n] invalid input:', arguments)
    return String(text)
  }

  //-------------- instance methods --------------
  a18n.x = function (text: any) {
    if (typeof text.length === 'number') {
      if (text.length === 1) {
        // shortcut for a18n.x`statictext`, due to misusage
        return [a18n(text)]
      }
      const template = compile(text, resource)
      const args = arguments

      let result = []
      for (let index = 0; index < template.length; index++) {
        const item = template[index]
        result.push(typeof item === 'number' ? args[item] : item)
      }
      return result
    }

    console.warn('[a18n] invalid input:', arguments)
    return [text]
  }
  a18n.addLocaleResource = addLocaleResource
  a18n.setLocale = setLocale
  a18n.getLocale = () => currentLocale

  //-------------- static methods --------------
  a18n.getA18n = getA18n

  a18n.DEBUG_reset = (resetSelfOnly = false) => {
    resources = {}
    resource = {}
    currentLocale = DEFAULT_LOCALE
    clearCompileCache()

    if (!resetSelfOnly) {
      const instances = ([] as A18n[])
        .concat(Object.values(globalInstances))
        .concat(Object.values(localInstances))
      instances.forEach((instance) => {
        if (instance !== a18n) {
          instance.DEBUG_reset(true)
        }
      })
    }
  }
  a18n.DEBUG_print = () => {
    const compileCache = DEBUG_getCompileCache()
    console.log(
      JSON.stringify(
        { currentLocale, resources, resource, compileCache },
        null,
        2,
      ),
    )
    return { currentLocale, resources, resource, compileCache }
  }

  return a18n
}

const a18n = (localInstances[DEFAULT_NAMESPACE] = create())

module.exports = a18n

export default a18n
export { LocaleResource } from '../types'
export { getA18n }
