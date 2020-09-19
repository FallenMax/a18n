import { LocaleResource } from '../types'
import { clearCompileCache, compile, DEBUG_getCompileCache } from './translator'

//-------------- Types --------------

export { LocaleResource } from '../types'
export { getA18n }

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
   * translate interpolated text (using ES6 Tagged Template syntax)
   *
   * @example
   * ```js
   * a18n`Hello ${userName}`
   * ```
   */
  (parts: TemplateStringsArray, ...values: (string | number)[]): string

  // /**
  //  * translate JSX Element array (using ES6 Tagged Template syntax)
  //  *
  //  * @example
  //  * ```jsx
  //  * <div>{ai8n.x`Hello {userName}`}</div> // `userName` is not limited to string, and can be any ReactNode
  //  * ```
  //  */
  // x(parts: TemplateStringsArray, ...values: ReactNode[]): ReactNode[]

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

  DEBUG_reset(): void
  DEBUG_print(): void
}

const DEFAULT_NAMESPACE = '__default_namespace__'
// @ts-ignore
const langs = typeof navigator !== 'undefined' ? navigator.languages || [] : []
const DEFAULT_LOCALE = langs[0] || 'en-US'

let instances: { [Namespace: string]: A18n } = {}

const getA18n = (namespace: string): A18n => {
  if (!instances[namespace]) {
    instances[namespace] = create()
  }
  return instances[namespace]
}

const create = (): A18n => {
  let currentLocale = DEFAULT_LOCALE
  let resources: { [K: string]: LocaleResource } = {
    [currentLocale]: {},
  }
  /** must be a reference to resources */
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
      const template = compile(text, resource)
      const args = arguments

      return template
        .map((item) => (typeof item === 'number' ? args[item] : item))
        .join('')
    }

    console.warn('[a18n] invalid input:', arguments)
    return String(text)
  }

  //-------------- instance methods --------------
  // a18n.x = (parts, ...values): ReactNode[] => {
  //   return []
  // }
  a18n.addLocaleResource = addLocaleResource
  a18n.setLocale = setLocale
  a18n.getLocale = () => currentLocale

  //-------------- static methods --------------
  a18n.getA18n = (namespace: string): A18n => {
    if (!instances[namespace]) {
      instances[namespace] = create()
    }
    return instances[namespace]
  }

  a18n.DEBUG_reset = () => {
    instances = {}
    resources = {}
    resource = {}
    currentLocale = DEFAULT_LOCALE
    clearCompileCache()
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

const a18n = getA18n(DEFAULT_NAMESPACE)

module.exports = a18n

export default a18n
