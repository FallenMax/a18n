import traverse from '@babel/traverse'
import * as t from '@babel/types'
import {
  LIB_FACTORY_IDENTIFIER,
  LIB_IDENTIFIER,
  LIB_METHOD_X_IDENTIFIER,
  LIB_MODULE,
} from '../constants'
import { parse, print } from '../util/ast'
import { readFile, writeFile } from '../util/file'

const fromStringLiteral = (
  node: object | null | undefined,
): undefined | string => {
  if (t.isStringLiteral(node)) {
    return node.value
  } else {
    return undefined
  }
}

export const purgeCode = (code: string, filePath: string): string => {
  const ast = parse(code, filePath)

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
                  if (
                    grandGrandParentPath &&
                    (t.isJSXElement(grandGrandParentPath.node) ||
                      t.isJSXFragment(grandGrandParentPath.node))
                  ) {
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
          //  a18n.x`中文${someVar}` =>
          //    inside JSX:  中文{someVar}
          //    else:  ['中文',someVar, '']
          case 'TemplateLiteral': {
            const parent = path.parent
            const parentPath = path.parentPath!
            const gParentPath = path.parentPath!.parentPath!

            if (parent.type === 'TaggedTemplateExpression') {
              // a18n`中文${someVar}`  => `中文${someVar}`
              if (
                t.isIdentifier(parent.tag) &&
                parent.tag.name === LIB_IDENTIFIER
              ) {
                parentPath.replaceWith(node)
                break
              }
              //  a18n.x`中文${someVar}` =>
              //    inside JSX:  中文{someVar}
              //    other:  ['中文',someVar, '']
              if (
                t.isMemberExpression(parent.tag) &&
                t.isIdentifier(parent.tag.object) &&
                parent.tag.object.name === LIB_IDENTIFIER &&
                t.isIdentifier(parent.tag.property) &&
                parent.tag.property.name === LIB_METHOD_X_IDENTIFIER
              ) {
                if (t.isJSXExpressionContainer(gParentPath.node)) {
                  const { quasis = [], expressions = [] } = node
                  const elements: t.Node[] = []
                  quasis.forEach((quasi, i) => {
                    const text = quasi.value.cooked ?? quasi.value.raw ?? ''
                    if (text) {
                      elements.push(t.jsxText(text))
                    }
                    const exp = expressions[i]
                    if (exp) {
                      elements.push(exp)
                    }
                  })

                  // FIXME
                  // Babel's "replaceWithMultiple" adds unnecessary parentheses
                  // https://stackoverflow.com/questions/55648184/babels-replacewithmultiple-adds-unnecessary-parentheses
                  gParentPath.replaceWithMultiple(elements)
                } else {
                  const { quasis = [], expressions = [] } = node
                  const elements: t.Expression[] = []
                  quasis.forEach((quasi, i) => {
                    elements.push(
                      t.stringLiteral(
                        quasi.value.cooked ?? quasi.value.raw ?? '',
                      ),
                    )
                    if (expressions[i]) {
                      elements.push(expressions[i] as t.Expression)
                    }
                  })

                  parentPath.replaceWith(t.arrayExpression(elements))
                }

                break
              }
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
            // remove a18n.xxxx()
            if (
              t.isMemberExpression(node.callee) &&
              t.isIdentifier(node.callee.object) &&
              node.callee.object.name === LIB_IDENTIFIER
            ) {
              path.remove()
            }
            // remove require("a18n")
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
        console.info('parents:', [path.parent.type, path.parentPath?.type])
        console.info('loc:', path.node.loc && path.node.loc.start)
        throw error
      }
    },
  })

  let output = print(ast)

  return output
}

export const purgeFile = (
  filePath: any,
  params: {
    write: boolean
    namespace: string | undefined
  },
) => {
  try {
    const content = readFile(filePath)
    const newContent = purgeCode(content, filePath)

    const changed = newContent !== content
    if (changed && params.write) {
      writeFile(filePath, newContent)
    }
    return {
      ok: true,
    }
  } catch (error) {
    return {
      ok: false,
      error,
    }
  }
}
