import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { SourceText } from '../../types'
import { LIB_IDENTIFIER } from '../constants'
import { extractModuleName } from '../module_name'
import { appendKey } from '../source_to_key'
import { parse } from '../util/ast'
import { readFile } from '../util/file'

const fromStringLiteral = (
  node: object | null | undefined,
): undefined | string => {
  if (!node) return undefined
  if (t.isStringLiteral(node)) {
    return node.value
  } else {
    return undefined
  }
}

export const toStaticText = (
  node: t.Node,
  text: string,
  filePath: string,
  lines: string[],
  moduleName: string | undefined,
): SourceText => {
  const loc = node.loc
  const line = loc ? loc.start.line : undefined
  const column = loc ? loc.start.column : undefined
  return appendKey({
    key: '',
    type: 'string',
    text: text,
    path: filePath,
    line,
    column,
    module: moduleName,
  })
}
export const toDynamicText = (
  node: t.Node,
  parts: string[],
  filePath: string,
  lines: string[],
  moduleName: string | undefined,
): SourceText => {
  const loc = node.loc
  const line = loc ? loc.start.line : undefined
  const column = loc ? loc.start.column : undefined
  return appendKey({
    key: '',
    type: 'interpolated',
    textParts: parts,
    path: filePath,
    line,
    column,
    module: moduleName,
  })
}

export const extractCode = (code: string, filePath: string): SourceText[] => {
  let sourceTexts: SourceText[] = []
  const ast = parse(code, filePath)

  const moduleName = extractModuleName(ast)

  const lines = code.split('\n')

  const addStaticText = (node: t.Node, text: string): void => {
    sourceTexts.push(toStaticText(node, text, filePath, lines, moduleName))
  }
  const addDynamicText = (node: t.Node, parts: string[]) => {
    sourceTexts.push(toDynamicText(node, parts, filePath, lines, moduleName))
  }

  traverse(ast, {
    enter(path) {
      const node = path.node

      switch (node.type) {
        case 'CallExpression': {
          if (t.isIdentifier(node.callee)) {
            const isTranslationCall = node.callee.name === LIB_IDENTIFIER
            if (isTranslationCall) {
              const arg0 = node.arguments[0]
              const text = fromStringLiteral(arg0)
              if (text != null) {
                addStaticText(node, text!)
              } else {
                const line = `${filePath}${
                  node.loc
                    ? ':' + node.loc.start.line + ':' + node.loc.start.column
                    : ''
                }\n`
                console.warn(
                  `WARNING: \n`,
                  `You should call a18n() with string literal, e.g. a18n("hello"), not a18n(greeting): \n`,
                  `file: ${line}`,
                )
              }
            }
          }

          break
        }

        case 'TaggedTemplateExpression': {
          const {
            tag,
            quasi: { quasis = [] },
          } = node
          // a18n`something`
          if (t.isIdentifier(tag) && tag.name === LIB_IDENTIFIER) {
            addDynamicText(
              node,
              quasis.map((q) => q.value.cooked ?? q.value.raw),
            )
            break
          }
          // a18n.anyMethod`something`
          if (
            t.isMemberExpression(tag) &&
            t.isIdentifier(tag.object) &&
            tag.object.name === LIB_IDENTIFIER
          ) {
            addDynamicText(
              node,
              quasis.map((q) => q.value.cooked ?? q.value.raw),
            )
            break
          }
        }
      }
    },
  })

  return sourceTexts
}

export const extractFile = (filePath: string) => {
  try {
    const content = readFile(filePath)
    const sourceTexts = extractCode(content, filePath)
    return {
      ok: true,
      sourceTexts,
    }
  } catch (error) {
    return {
      ok: false,
      error,
    }
  }
}
