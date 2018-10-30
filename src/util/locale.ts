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
    return (
      value == null || typeof value === 'string' || typeof value === 'object'
    )
  })
}

export const sourceTextToKey = (sourceText: SourceText): string => {
  switch (sourceText.type) {
    case 'string': {
      const { id, text } = sourceText
      const key = id ? `${text}#${id}` : text
      return key
    }
    case 'interpolated': {
      const partCount = sourceText.textParts.length
      if (partCount === 1) {
        return sourceText.textParts[0]
      } else if (partCount === 2) {
        return `${sourceText.textParts[0]}%s${sourceText.textParts[1]}`
      } else {
        return sourceText.textParts
          .map((part, i) => {
            return i === sourceText.textParts.length - 1
              ? part
              : `${part}%${i + 1}`
          })
          .join('')
      }
    }

    default:
      return assertNever(sourceText)
  }
}
