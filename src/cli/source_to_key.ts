import { SourceText, SourceTextRaw } from '../types'
import { assertNever } from '../util/assert-never'

export const appendKey = <T extends SourceText>(sourceText: T): T => {
  return {
    ...sourceText,
    key: sourceTextToKey(sourceText),
  }
}

export const sourceTextToKey = (
  sourceText: SourceTextRaw | SourceText,
): string => {
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
