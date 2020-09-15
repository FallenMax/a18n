import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
// @ts-ignore
import * as recast from 'recast'
import {
  LIB_FACTORY_IDENTIFIER,
  LIB_IDENTIFIER,
  LIB_IGNORE_FILE,
  LIB_IGNORE_LINE,
  LIB_MODULE,
} from '../constants'

export const needTranslate = (str: string): boolean => {
  return /[^\u0000-\u007F]+/.test(str)
}

const isCommentLine = (line: string | null): boolean => {
  return Boolean(line && /^\s*(\*|\/\/|\/\*)/gi.test(line))
}

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
export const tsxWrapper = ({ ext }: { ext: string }) => (
  code: string,
  options: { namespace: string | undefined },
): string => {
  if (code.includes(LIB_IGNORE_FILE)) {
    return code
  }
  const { namespace } = options

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

  let libUsed = false
  let importStatementCount = 0
  let requireCallExpressionCount = 0

  const lines = code.split('\n')

  const markLibUsed = (): void => {
    libUsed = true
  }

  traverse(ast, {
    enter(path) {
      const node = path.node
      const lineStart = node.loc ? node.loc.start.line - 1 : -1
      const lineAbove = lines[lineStart - 1]
      if (isCommentLine(lineAbove) && lineAbove.includes(LIB_IGNORE_LINE)) {
        return
      }

      try {
        switch (node.type) {
          // '中文' => a18n('中文')
          case 'StringLiteral': {
            if (needTranslate(node.value)) {
              // 忽略已经是 a18n(’中文’) 的情况
              const parent = path.parent
              if (
                parent.type === 'CallExpression' &&
                t.isIdentifier(parent.callee) &&
                parent.callee.name === LIB_IDENTIFIER
              ) {
                markLibUsed()
                break
              }

              // <input placeholder="中文" /> => <input placeholder={a18n('中文') />
              if (t.isJSXAttribute(parent)) {
                path.replaceWith(
                  t.jsxExpressionContainer(
                    t.callExpression(t.identifier(LIB_IDENTIFIER), [
                      t.stringLiteral(node.value),
                    ]),
                  ),
                )
                markLibUsed()
              } else if (
                // is Object key
                !(t.isProperty(parent) && parent.key === node) &&
                // is ts type
                !t.isTSLiteralType(parent)
              ) {
                path.replaceWith(
                  t.callExpression(t.identifier(LIB_IDENTIFIER), [
                    t.stringLiteral(node.value),
                  ]),
                )
                markLibUsed()
              }
            }
            break
          }

          // `中文${someVar}` => a18n`中文${someVar}`
          case 'TemplateLiteral': {
            const { quasis } = node
            if (quasis.some((q) => needTranslate(q.value.raw))) {
              // 忽略已经是 a18n`中文${someVar}` 的情况
              const parent = path.parent
              if (
                parent.type === 'TaggedTemplateExpression' &&
                t.isIdentifier(parent.tag) &&
                parent.tag.name === LIB_IDENTIFIER
              ) {
                markLibUsed()
                break
              }

              if (parent.type !== 'TaggedTemplateExpression') {
                path.replaceWith(
                  t.taggedTemplateExpression(
                    t.identifier(LIB_IDENTIFIER),
                    node,
                  ),
                )
                markLibUsed()
              }
            }
            break
          }

          // <div>  中文  </div> => <div>  {a18n('中文')}  </div>
          case 'JSXText': {
            if (needTranslate(node.value)) {
              const emptyStart = node.value.match(/^\s*/)![0]
              const emptyEnd = node.value.match(/\s*$/)![0]
              const nonEmptyText = node.value.trim()
              path.replaceWithMultiple([
                t.jsxText(emptyStart),
                t.jsxExpressionContainer(t.stringLiteral(nonEmptyText)),
                t.jsxText(emptyEnd),
              ])
              markLibUsed()
            }
            break
          }

          case 'ImportDeclaration': {
            // 记录import数量
            importStatementCount++

            if (node.source.value === LIB_MODULE) {
              markLibUsed()
              // 去掉 import 语句，后面重新添加
              path.remove()
            }

            break
          }

          case 'CallExpression': {
            if (t.isIdentifier(node.callee)) {
              // 记录require数量
              if (node.callee.name === 'require') {
                requireCallExpressionCount++
              }

              // 清除 a18n 定义
              const isRequireLibModule =
                node.callee.name === 'require' &&
                fromStringLiteral(node.arguments[0]) === LIB_MODULE
              const isDefineLib = node.callee.name === LIB_FACTORY_IDENTIFIER
              if (isRequireLibModule || isDefineLib) {
                markLibUsed()
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
        throw error
      }
    },
  })

  let output = recast.print(ast, {
    tabWidth: 2,
    quote: 'single',
  }).code

  if (libUsed) {
    const shouldUseImport = importStatementCount >= requireCallExpressionCount
    const importDeclarators = namespace
      ? `{ ${LIB_FACTORY_IDENTIFIER} }`
      : LIB_IDENTIFIER
    const importStatement = shouldUseImport
      ? `import ${importDeclarators} from '${LIB_MODULE}'\n`
      : `const ${importDeclarators} = require('${LIB_MODULE}')\n`
    const factoryStatement = namespace
      ? `const a18n = ${LIB_FACTORY_IDENTIFIER}('${namespace}')\n`
      : ''
    output = importStatement + factoryStatement + output
  }

  return output
}
