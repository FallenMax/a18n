import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { SourceTextWithContext } from '../../types'
import {
  LIB_FACTORY_IDENTIFIER,
  LIB_IDENTIFIER,
  LIB_IGNORE_FILE,
  LIB_IGNORE_LINE,
  LIB_MODULE,
} from '../constants'
import { toDynamicText, toStaticText } from '../extract/tsx-extractor'
import { parse, print } from '../util/ast'
import { readFile, writeFile } from '../util/file'

const removeImportRequireFactory = (ast: any, lines: string[]) => {
  traverse(ast, {
    enter(path) {
      const node = path.node
      const lineStart = node.loc ? node.loc.start.line - 1 : -1
      const lineAbove = lines[lineStart - 1]
      if (lineAbove?.includes(LIB_IGNORE_LINE)) {
        return
      }

      try {
        switch (node.type) {
          case 'ImportDeclaration': {
            if (node.source.value === LIB_MODULE) {
              path.remove()
            }
            break
          }

          case 'CallExpression': {
            if (t.isIdentifier(node.callee)) {
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
        throw error
      }
    },
  })
}

export const needTranslate = (str: string): boolean => {
  return /[^\u0000-\u007F]+/.test(str) && !/^\s*$/.test(str)
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

export const wrapCode = (
  code: string,
  options: {
    filePath?: string
    namespace?: string
    checkOnly?: boolean
  },
): {
  output: string
  sourceTexts: SourceTextWithContext[]
} => {
  if (code.includes(LIB_IGNORE_FILE)) {
    return {
      output: code,
      sourceTexts: [],
    }
  }
  const { namespace, checkOnly, filePath = '' } = options

  const ast = parse(code)

  let libUsed = false
  const markLibUsed = (): void => {
    libUsed = true
  }
  let libImportStatus = {
    imported: false,
    required: false,
    namespace: undefined as string | undefined,
  }

  let importStatementCount = 0
  let requireCallExpressionCount = 0

  const lines = code.split('\n')

  let sourceTexts = [] as SourceTextWithContext[]
  const addStaticText = (node: t.Node, text: string): void => {
    sourceTexts.push(toStaticText(node, text, filePath, lines))
  }
  const addDynamicText = (node: t.Node, parts: string[]) => {
    sourceTexts.push(toDynamicText(node, parts, filePath, lines))
  }

  traverse(ast, {
    enter(path) {
      const node = path.node
      const lineStart = node.loc ? node.loc.start.line - 1 : -1
      const line = lines[lineStart]
      const lineAbove = lines[lineStart - 1]
      if (
        lineAbove?.includes(LIB_IGNORE_LINE) ||
        line?.includes(LIB_IGNORE_LINE)
      ) {
        return
      }

      try {
        switch (node.type) {
          // '中文' => a18n('中文')
          case 'StringLiteral': {
            if (needTranslate(node.value)) {
              // ignore when it's already: a18n(’中文’)
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
                if (checkOnly) {
                  addStaticText(node, node.value)
                } else {
                  path.replaceWith(
                    t.jsxExpressionContainer(
                      t.callExpression(t.identifier(LIB_IDENTIFIER), [
                        t.stringLiteral(node.value),
                      ]),
                    ),
                  )
                }
                markLibUsed()
              } else if (
                !(t.isProperty(parent) && parent.key === node) &&
                !t.isTSLiteralType(parent) &&
                !t.isTSEnumMember(parent)
              ) {
                if (checkOnly) {
                  addStaticText(node, node.value)
                } else {
                  path.replaceWith(
                    t.callExpression(t.identifier(LIB_IDENTIFIER), [
                      t.stringLiteral(node.value),
                    ]),
                  )
                }
                markLibUsed()
              }
            }
            break
          }

          // `中文${someVar}` => a18n`中文${someVar}`
          case 'TemplateLiteral': {
            const { quasis } = node
            if (quasis.some((q) => needTranslate(q.value.raw))) {
              const parent = path.parent
              if (parent.type === 'TaggedTemplateExpression') {
                // ignore when it's already wrapped: a18n`中文${someVar}`
                if (
                  t.isIdentifier(parent.tag) &&
                  parent.tag.name === LIB_IDENTIFIER
                ) {
                  markLibUsed()
                  break
                }
                // ignore when it's already wrapped: a18n.anyMethod`中文${someVar}`
                if (
                  t.isMemberExpression(parent.tag) &&
                  t.isIdentifier(parent.tag.object) &&
                  parent.tag.object.name === LIB_IDENTIFIER
                ) {
                  markLibUsed()
                  break
                }
              }

              if (parent.type !== 'TaggedTemplateExpression') {
                if (checkOnly) {
                  addDynamicText(
                    node,
                    quasis.map((q) => q.value.raw),
                  )
                } else {
                  path.replaceWith(
                    t.taggedTemplateExpression(
                      t.identifier(LIB_IDENTIFIER),
                      node,
                    ),
                  )
                }
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
              if (checkOnly) {
                addStaticText(node, nonEmptyText)
              } else {
                path.replaceWithMultiple([
                  t.jsxText(emptyStart),
                  t.jsxExpressionContainer(t.stringLiteral(nonEmptyText)),
                  t.jsxText(emptyEnd),
                ])
              }
              markLibUsed()
            }
            break
          }

          case 'ImportDeclaration': {
            importStatementCount++

            if (node.source.value === LIB_MODULE) {
              libImportStatus.imported = true
            }
            break
          }

          case 'CallExpression': {
            if (t.isIdentifier(node.callee)) {
              if (node.callee.name === 'require') {
                requireCallExpressionCount++
              }

              const isRequireLibModule =
                node.callee.name === 'require' &&
                fromStringLiteral(node.arguments[0]) === LIB_MODULE
              if (isRequireLibModule) {
                libImportStatus.required = true
              }

              const isDefineLib = node.callee.name === LIB_FACTORY_IDENTIFIER
              if (isDefineLib) {
                const namespace = fromStringLiteral(node.arguments[0])
                libImportStatus.namespace = namespace
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

  if (checkOnly || !libUsed) {
    return {
      output: code,
      sourceTexts,
    }
  }

  let output: string
  if (
    (libImportStatus.imported || libImportStatus.required) &&
    libImportStatus.namespace == namespace
  ) {
    output = print(ast)
  } else {
    removeImportRequireFactory(ast, lines)
    output = print(ast)

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

  return {
    output,
    sourceTexts,
  }
}

export const wrapFile = (
  filePath: string,
  params: {
    write: boolean
    namespace?: string
    checkOnly?: boolean
  },
) => {
  try {
    const { namespace, checkOnly } = params
    const content = readFile(filePath)
    const { output: newContent, sourceTexts } = wrapCode(content, {
      filePath,
      namespace,
      checkOnly,
    })

    const changed = newContent !== content
    if (changed && params.write && !checkOnly) {
      writeFile(filePath, newContent)
    }
    return {
      ok: true,
      sourceTexts,
    }
  } catch (error) {
    const loc = error?.loc
    if (loc) {
      console.error(
        `[a18n] error processing: ${filePath}:${loc.line}:${loc.column}`,
      )
    } else {
      console.error(`[a18n] error processing: ${filePath}`)
    }
    console.error(error)
    return {
      ok: false,
    }
  }
}
