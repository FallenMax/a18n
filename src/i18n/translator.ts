import { LocaleResource } from '../types'

export type CompiledTemplate = (string | number)[]

export type TemplateCache = {
  [K: string]: undefined | CompiledTemplate | TemplateCache
}

const SYMBOL_END =
  typeof Symbol !== 'undefined'
    ? Symbol.for('a18n-compiled')
    : '__$a18n-compiled'

// let cache: CompiledResource = {}

const loadTemplate = (
  parts: string[],
  cache: TemplateCache,
): CompiledTemplate | undefined => {
  let o = cache as any
  for (let i = 0; i < parts.length && o; i++) {
    o = o[parts[i]]
  }
  return o && o[SYMBOL_END]
}

const saveTemplate = (
  path: string[],
  template: CompiledTemplate,
  cache: TemplateCache,
) => {
  let o: any = cache
  for (let i = 0; i < path.length && o; i++) {
    o = o[path[i]] || (o[path[i]] = {} as TemplateCache)
  }
  o[SYMBOL_END] = template
  return template
}

const doCompile = (parts: string[], resource: LocaleResource) => {
  const partCount = parts.length
  const keyTemplate = parts
    .map((part, i) => {
      return i === partCount - 1
        ? part
        : `${part}%${partCount === 2 ? 's' : i + 1}`
    })
    .join('')
  const valueTemplate = resource[keyTemplate]

  const templateString =
    typeof valueTemplate === 'string' ? valueTemplate : keyTemplate

  return templateString.split(/(%s|%\d)/g).map((item) => {
    const [_, pos] = /^%(s|\d)$/g.exec(item) || []
    if (pos) {
      return pos === 's' ? 1 : Number(pos)
    } else {
      return item
    }
  })
}

/**
 * preprocess dynamic text into template, making future translation faster
 * (~10x than previous parse/interpolate approach)
 *
 * @example
 * key-value pair: { 'x%1y%2z%3w': 'aa%3bb%1cc' }
 * will generate a compiled template: ["aa", 3, "bb", 1, "cc"]
 * and be cached under path [x,y,z,w,SYMBOL_END]
 */
export const compile = (
  parts: string[],
  resource: LocaleResource,
  cache: TemplateCache,
) => {
  return (
    loadTemplate(parts, cache) ||
    saveTemplate(parts, doCompile(parts, resource), cache)
  )
}
