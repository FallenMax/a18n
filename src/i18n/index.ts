import { A18n, LocaleResource } from '../types'
import { repeatArray, repeatString } from '../util/repeat'
import { compile, TemplateCache } from './translator'

//-------------- Types --------------

const RESOURCE_VERSION = '3'

// @ts-ignore
const langs = typeof navigator !== 'undefined' ? navigator.languages || [] : []
const DEFAULT_LOCALE = langs[0] || 'en-US'
// do not share by default.
// different code (instance) should only share resources if they specify a common namespace
const DEFAULT_NAMESPACE = `__$a18n_namespace_${Date.now()}_${String(
  Math.random(),
).slice(2)}`
const ROOT_KEY = `__$a18n-global_resource_${RESOURCE_VERSION}__`

declare var window: any

/** repeat translated string multiple times, so that ui issues like text overflow can be spotted easily */
let debugRepeatCount: undefined | number
let debugRepeatSeparator: undefined | string = ' '
const debugSetRepeat = (
  count: number | undefined,
  separator: string | undefined = ' ',
) => {
  debugRepeatCount = count
  debugRepeatSeparator = separator
}
const repeatStringIfNeeded = (str: string) => {
  return debugRepeatCount
    ? repeatString(str, debugRepeatCount, debugRepeatSeparator)
    : str
}
const repeatArrayIfNeeded = (arr: any[]) => {
  return debugRepeatCount
    ? repeatArray(arr, debugRepeatCount, debugRepeatSeparator)
    : arr
}

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

type GlobalResources = {
  /** @note references to each namespace are expected not to change */
  [Namespace: string]: {
    currentLocale: string
    cache: TemplateCache
    resources: {
      [Locale: string]: LocaleResource
    }
  }
}
let root: GlobalResources = _global[ROOT_KEY] || (_global[ROOT_KEY] = {})

const getA18n = (namespace: string, moduleName?: string): A18n => {
  const ns =
    root[namespace] ||
    (root[namespace] = {
      currentLocale: DEFAULT_LOCALE,
      cache: {},
      resources: {},
    })

  const clearCompileCache = () => {
    ns.cache = {}
  }

  const setLocale: A18n['setLocale'] = (locale: string) => {
    if (typeof locale !== 'string') {
      throw new TypeError(`'locale' is expect to be a string`)
    }
    if (ns.currentLocale === locale) return

    ns.currentLocale = locale
    clearCompileCache()
  }

  const addLocaleResource: A18n['addLocaleResource'] = (locale, res) => {
    if (!ns.resources[locale]) {
      ns.resources[locale] = res
    } else {
      Object.assign(ns.resources[locale], res)
    }
    clearCompileCache()
  }

  const getResource = (): LocaleResource => {
    let resource =
      ns.resources[ns.currentLocale] || (ns.resources[ns.currentLocale] = {})
    if (moduleName != null) {
      const moduleResource = resource[moduleName] || (resource[moduleName] = {})
      if (!(moduleResource && typeof moduleResource === 'object')) {
        console.error(
          `[a18n] resource at ${namespace}::${moduleName} is not an object:`,
          ns.resources,
        )
        resource = {}
      } else {
        resource = moduleResource
      }
    }
    return resource
  }
  const getCache = (): TemplateCache => {
    let cache = ns.cache
    if (moduleName != null) {
      const moduleCache = cache[moduleName] || (cache[moduleName] = {})
      if (!(moduleCache && typeof moduleCache === 'object')) {
        console.error(
          `[a18n] cache at ${cache}::${moduleName} is not an object:`,
          ns.resources,
        )
        cache = {}
      } else {
        cache = moduleCache as TemplateCache
      }
    }
    return cache
  }

  function a18n(text: any): string {
    const resource = getResource()
    const cache = getCache()
    if (typeof text === 'string') {
      const translated = resource[text]
      return repeatStringIfNeeded(
        typeof translated === 'string' ? translated : text,
      )
    }

    if (text && typeof text.length === 'number') {
      if (text.length === 1) {
        // shortcut for a18n`statictext`, due to misusage
        return repeatStringIfNeeded(a18n(text[0]))
      }
      const template = compile(text, resource, cache)
      const args = arguments

      let result = ''
      for (let index = 0; index < template.length; index++) {
        const item = template[index]
        result += typeof item === 'number' ? String(args[item]) : item
      }
      return repeatStringIfNeeded(result)
    }

    console.warn('[a18n] invalid input:', arguments)
    const result = String(text)
    return repeatStringIfNeeded(result)
  }

  //-------------- instance methods --------------
  a18n.x = function (text: any) {
    const resource = getResource()
    const cache = getCache()
    if (typeof text.length === 'number') {
      if (text.length === 1) {
        // shortcut for a18n.x`statictext`, due to misusage
        return repeatArrayIfNeeded([a18n(text)])
      }
      const template = compile(text, resource, cache)
      const args = arguments

      let result = []
      for (let index = 0; index < template.length; index++) {
        const item = template[index]
        result.push(typeof item === 'number' ? args[item] : item)
      }
      return repeatArrayIfNeeded(result)
    }

    console.warn('[a18n] invalid input:', arguments)
    const result = [text]
    return repeatArrayIfNeeded(result)
  }

  a18n.addLocaleResource = addLocaleResource
  a18n.setLocale = setLocale
  a18n.getLocale = () => ns.currentLocale || DEFAULT_LOCALE

  //-------------- static methods --------------
  a18n.getA18n = getA18n

  a18n.DEBUG_setRepeat = debugSetRepeat

  a18n.DEBUG_reset = () => {
    Object.keys(root).forEach((namespace) => {
      const ns = root[namespace]
      ns.currentLocale = DEFAULT_LOCALE
      ns.resources = {}
      ns.cache = {}
    })
    clearCompileCache()
  }
  a18n.DEBUG_print = () => {
    const obj = { ns, resource: getResource(), root }
    console.log(JSON.stringify(obj, null, 2))
    return obj
  }

  return a18n
}

const a18n = getA18n(DEFAULT_NAMESPACE)

export default a18n
export { LocaleResource } from '../types'
export { getA18n }
