import { LocaleResource, SourceText } from '../types'
import { assertNever } from './assert-never'

export const isValidLocaleResource = (o: any): o is LocaleResource => {
  if (!o) {
    return false
  }
  if (Array.isArray(o)) {
    return false
  }
  if (typeof o !== 'object') {
    return false
  }

  return Object.keys(o).every((key) => {
    const value = o[key]
    return value == null || typeof value === 'string'
  })
}

export const sourceTextToKey = (sourceText: SourceText): string => {
  switch (sourceText.type) {
    case 'string': {
      return sourceText.text
    }
    case 'interpolated': {
      const partCount = sourceText.textParts.length
      return sourceText.textParts
        .map((part, i) => {
          return i === partCount - 1
            ? part
            : `${part}%${partCount === 2 ? 's' : i + 1}`
        })
        .join('')
    }
    default:
      return assertNever(sourceText)
  }
}
