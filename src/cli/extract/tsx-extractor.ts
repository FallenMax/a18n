import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
// @ts-ignore
import * as recast from 'recast'
import { Context, SourceText, SourceTextWithContext } from '../../types'
import { LIB_IDENTIFIER } from '../constants'

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

export const tsxExtractor = ({ ext }: { ext: string }) => (
  code: string,
  filePath: string,
): (SourceText & { context: Context })[] => {
  let sourceTexts = [] as SourceTextWithContext[]
  const addStaticText = (node: t.Node, text: string, id?: string): void => {
    const loc = node.loc
    const line = loc ? loc.start.line : undefined
    const column = loc ? loc.start.column : undefined
    sourceTexts.push({
      type: 'string',
      text: text,
      id,
      context: {
        path: filePath,
        line,
        column,
        text: loc ? lines[loc.start.line] : undefined,
      },
    })
  }
  const addDynamicText = (node: t.Node, parts: string[]) => {
    const loc = node.loc
    const line = loc ? loc.start.line : undefined
    const column = loc ? loc.start.column : undefined
    sourceTexts.push({
      type: 'interpolated',
      textParts: parts,
      context: {
        path: filePath,
        line,
        column,
        text: loc ? lines[loc.start.line] : undefined,
      },
    })
  }

  const ast = recast.parse(code, {
    parser: {
      parse(source: string) {
        return parser.parse(source, {
          tokens: true,
          sourceType: 'module',
          plugins: [
            'jsx',
            'typescript',
            'objectRestSpread',
            'asyncGenerators',
            'classProperties',
            'dynamicImport',
            'decorators-legacy',
            'optionalCatchBinding',
            'optionalChaining',
            'nullishCoalescingOperator',
          ],
        })
      },
    },
  })
  const lines = code.split('\n')

  const invariant = (condition: any, node: t.Node, message: string) => {
    if (!condition) {
      throw new Error(
        `${filePath}${
          node.loc
            ? ':' + node.loc.start.line + ':' + node.loc.start.column
            : ''
        }` +
          ' ' +
          message,
      )
    }
  }

  traverse(ast, {
    enter(path) {
      const node = path.node

      switch (node.type) {
        case 'CallExpression': {
          if (
            t.isIdentifier(node.callee) &&
            node.callee.name === LIB_IDENTIFIER
          ) {
            switch (node.arguments.length) {
              case 1: {
                const arg0 = node.arguments[0]
                const text = fromStringLiteral(arg0)
                invariant(
                  text != null,
                  node,
                  `${LIB_IDENTIFIER}() has signature: a18n(text:string), instead received: ${node.arguments.map(
                    (a) => a.type,
                  )}`,
                )
                addStaticText(node, text!)
                break
              }
              default: {
                invariant(
                  false,
                  node,
                  `export ${LIB_IDENTIFIER}() has signature: a18n(text:string), instead received: ${node.arguments.map(
                    (a) => a.type,
                  )}`,
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
          if (t.isIdentifier(tag) && tag.name === LIB_IDENTIFIER) {
            addDynamicText(
              node,
              quasis.map((q) => q.value.raw),
            )
          }
          break
        }

        default:
          break
      }
    },
  })

  return sourceTexts
}
