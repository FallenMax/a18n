import { LocaleResource } from '../types'
import { isValidLocaleResource } from '../util/locale'
import { getInterpolateResult, getTextResult, interweave } from './translator'

//-------------- Types --------------

export { LocaleResource } from '../types'
export { getA18n }

export interface TranslateParams {
  _?: string
}

export interface a18n {
  /** translate static text */
  (text: string, params?: TranslateParams): string

  /** translated interpolated text */
  (parts: TemplateStringsArray, ...values: any[]): string

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
  getA18n(namespace: string): a18n

  DEBUG_reset(): void
}

const DEFAULT_NAMESPACE = '__default_namespace__'
const DEFAULT_LOCALE = 'zh-CN'

let instances: { [Namespace: string]: a18n } = {}

const getA18n = (namespace: string): a18n => {
  if (!instances[namespace]) {
    instances[namespace] = create()
  }
  return instances[namespace]
}

const DEBUG_reset = () => {
  instances = {}
}

const create = (): a18n => {
  let currentLocale = DEFAULT_LOCALE
  let localeCache: { [K: string]: LocaleResource } = {}

  const addLocaleResource: a18n['addLocaleResource'] = (locale, resource) => {
    if (!isValidLocaleResource(resource)) {
      throw new Error('fetched locale resource is invalid')
    } else {
      localeCache[locale] = {
        ...(localeCache[locale] || {}),
        ...resource,
      }
    }
  }

  const setLocale: a18n['setLocale'] = (locale: string) => {
    if (typeof locale !== 'string') {
      throw new Error(`'locale' is required`)
    }

    currentLocale = locale
  }

  const a18n = ((...args: any[]): string => {
    if (typeof args[0] === 'string') {
      const [text, params] = args
      const id: string | undefined =
        params && typeof params._ === 'string' ? params._ : undefined
      const key = id ? text + '#' + id : text
      if (!key) return ''
      const currentLocaleText = getTextResult(key, localeCache[currentLocale])
      if (typeof currentLocaleText === 'string') return currentLocaleText

      return text
    } else if (args[0] && typeof args[0].length === 'number') {
      const [parts, ...values] = args

      return (
        getInterpolateResult(parts, values, localeCache[currentLocale]) ||
        interweave(parts, values)
      )
    } else {
      console.warn('[a18n] invalid input:', ...args)
      return ''
    }
  }) as a18n

  //-------------- instance methods --------------
  a18n.addLocaleResource = addLocaleResource
  a18n.setLocale = setLocale
  a18n.getLocale = () => currentLocale

  //-------------- static methods --------------
  a18n.getA18n = getA18n
  a18n.DEBUG_reset = DEBUG_reset

  return a18n
}

const a18n = getA18n(DEFAULT_NAMESPACE)

module.exports = a18n

export default a18n
