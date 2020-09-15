import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
// @ts-ignore
import * as recast from 'recast'
import {
  LIB_FACTORY_IDENTIFIER,
  LIB_IDENTIFIER,
  LIB_MODULE,
} from '../constants'

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
export const tsxPurger = ({ ext }: { ext: string }) => (
  code: string,
): string => {
  const parse = (source: string) =>
    parser.parse(source, {
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

  const ast = recast.parse(code, { parser: { parse } })

  const lines = code.split('\n')

  traverse(ast, {
    enter(path) {
      const node = path.node
      const lineStart = node.loc ? node.loc.start.line - 1 : -1
      const lineAbove = lines[lineStart - 1]

      try {
        switch (node.type) {
          // a18n('中文') => '中文'
          case 'StringLiteral':
            {
              const parentPath = path.parentPath
              const parent = parentPath?.node
              const { value } = node
              if (
                parent &&
                t.isCallExpression(parent) &&
                t.isIdentifier(parent.callee) &&
                parent.callee.name === LIB_IDENTIFIER
              ) {
                const grandParentPath = parentPath.parentPath
                // {"中文"}
                if (
                  grandParentPath &&
                  t.isJSXExpressionContainer(grandParentPath.node)
                ) {
                  const grandGrandParentPath = grandParentPath.parentPath
                  // <>{"中文"}<>
                  if (t.isJSXElement(grandGrandParentPath.node)) {
                    grandParentPath.replaceWith(t.jsxText(value))
                  } else {
                    grandParentPath.replaceWith(node)
                  }
                } else {
                  parentPath.replaceWith(node)
                }
                break
              }
            }
            break

          //  a18n`中文${someVar}` => `中文${someVar}`
          case 'TemplateLiteral': {
            const { quasis } = node
            const parent = path.parent
            if (
              t.isTaggedTemplateExpression(parent) &&
              t.isIdentifier(parent.tag) &&
              parent.tag.name === LIB_IDENTIFIER
            ) {
              path.parentPath.replaceWith(node)
            }
            break
          }

          // remove import statement
          case 'ImportDeclaration': {
            if (node.source.value === LIB_MODULE) {
              path.remove()
            }
            break
          }

          case 'CallExpression': {
            // remove s18n.xxxx()
            if (
              t.isMemberExpression(node.callee) &&
              t.isIdentifier(node.callee.object) &&
              node.callee.object.name === LIB_IDENTIFIER
            ) {
              path.remove()
            }
            // remove require("s18n")
            else if (t.isIdentifier(node.callee)) {
              const isRequireLibModule =
                node.callee.name === 'require' &&
                fromStringLiteral(node.arguments[0]) === LIB_MODULE
              const isDefineLib = node.callee.name === LIB_FACTORY_IDENTIFIER
              if (isRequireLibModule || isDefineLib) {
                const parent = path.findParent((path) =>
                  t.isVariableDeclaration(path.node),
                )
                if (parent) {
                  parent.remove()
                }
              }
            }

            break
          }

          default:
            break
        }
      } catch (error) {
        console.info('parents:', [path.parent.type, path.parentPath.type])
        console.info('loc:', path.node.loc && path.node.loc.start)
        throw error
      }
    },
  })

  let output = recast.print(ast, {
    tabWidth: 2,
    quote: 'single',
  }).code

  return output
}
