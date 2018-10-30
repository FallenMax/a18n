import { LocaleResource } from '../types'
import { sourceTextToKey } from '../util/locale'

export const interweave = (
  parts: TemplateStringsArray,
  values: any[],
): string => {
  return parts
    .map((part, index) => {
      return index === parts.length - 1 ? part : `${part}${values[index]}`
    })
    .join('')
}

export const getTextResult = (
  key: string,
  resource: LocaleResource | undefined,
): string | undefined => {
  return resource && (resource[key] as string | undefined)
}

const PLACEHOLDER_RE = /%(s|\d)/g
export const getInterpolateResult = (
  parts: TemplateStringsArray,
  values: any[],
  resource: LocaleResource | undefined,
): string | undefined => {
  try {
    if (!resource) {
      return undefined
    }
    const key = sourceTextToKey({
      type: 'interpolated',
      textParts: parts as any,
    })
    const translation = resource[key]
    if (!translation) {
      return undefined
    }
    // use %s, %1, %2, ... as variable placeholders
    let valueMap = {} as {
      [K: string]: any
    }
    let i = 0
    key.replace(PLACEHOLDER_RE, (match) => {
      valueMap[match] = values[i]
      i = i + 1
      return match
    })
    const interpolate = (
      str: string,
      valueMap: {
        [K: string]: any
      },
    ): string => {
      return str.replace(PLACEHOLDER_RE, (match) => {
        if (valueMap[match] !== null) {
          return String(valueMap[match])
        } else {
          console.warn('[a18n] interpolation failed:', { str, valueMap })
          return match
        }
      })
    }
    if (typeof translation === 'string') {
      return interpolate(translation, valueMap)
    } else if (typeof translation === 'object') {
      return undefined
    } else {
      console.warn('[a18n] Unexpected value: ' + JSON.stringify(translation))
      return undefined
    }
  } catch (error) {
    const args = {
      parts,
      values,
      resource,
    }
    console.error('[a18n] error when translating: ', args)
    console.error(error)
    return undefined
  }
}
