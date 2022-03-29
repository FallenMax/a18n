import traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import CJK from 'cjk-regex'
import { relative } from 'path'
import { SourceText } from '../../types'
import { assertNever } from '../../util/assert-never'
import {
  LIB_FACTORY_IDENTIFIER,
  LIB_IDENTIFIER,
  LIB_IGNORE_FILE,
  LIB_IGNORE_LINE,
  LIB_METHOD_X_IDENTIFIER,
  LIB_MODULE,
} from '../constants'
import { toDynamicText, toStaticText } from '../extract/tsx-extractor'
import { extractModuleName } from '../module_name'
import { parse, print } from '../util/ast'
import { readFile, writeFile } from '../util/file'
import assert = require('assert')
import path = require('path')

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

const cjkRegex = CJK().toRegExp()
export const needTranslate = (str: string): boolean => {
  return cjkRegex.test(str)
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
export type ModuleNameTemplate = 'filePath' | 'fileName' | 'fileDirAndName'

export interface WrapOptions {
  basePath?: string
  namespace?: string
  moduleName?: ModuleNameTemplate
  moduleNameUpdate?: boolean
  checkOnly?: boolean
}

export const wrapCode = (
  code: string,
  {
    filePath,
    basePath,
    moduleName,
    namespace,
    checkOnly = false,
    moduleNameUpdate = true,
  }: WrapOptions & {
    filePath?: string
  },
): {
  output: string
  sourceTexts: SourceText[]
} => {
  if (code.includes(LIB_IGNORE_FILE)) {
    return {
      output: code,
      sourceTexts: [],
    }
  }

  const ast = parse(code)
  const existModuleName = extractModuleName(ast)
  const newModuleName: string | undefined = (() => {
    if (!moduleName) return existModuleName
    if (existModuleName && !moduleNameUpdate) return existModuleName

    assert(filePath, 'filePath is required when moduleName is specified')
    assert(basePath, 'basePath is required when moduleName is specified')
    const { dir, base, name, ext } = path.parse(filePath)
    switch (moduleName) {
      case 'fileName': {
        return name
      }
      case 'fileDirAndName': {
        const relativeDir = relative(basePath, dir)
        const lastDir = relativeDir.split(/\/|\\/).pop()
        if (lastDir) {
          return `${lastDir}/${name}`
        } else {
          return name
        }
      }
      case 'filePath': {
        const relativeDir = relative(basePath, dir)
        return (relativeDir + '/' + name)
          .split(/\/|\\/)
          .filter(Boolean)
          .join('/')
      }
      default:
        return assertNever(moduleName)
    }
  })()

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

  let sourceTexts = [] as SourceText[]
  const addStaticText = (node: t.Node, text: string): void => {
    sourceTexts.push(
      toStaticText(node, text, filePath ?? '', lines, newModuleName),
    )
  }
  const addDynamicText = (node: t.Node, parts: string[]) => {
    sourceTexts.push(
      toDynamicText(node, parts, filePath ?? '', lines, newModuleName),
    )
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
            if (
              quasis.some((q) => needTranslate(q.value.cooked ?? q.value.raw))
            ) {
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
              } else {
                if (checkOnly) {
                  addDynamicText(
                    node,
                    quasis.map((q) => q.value.cooked ?? q.value.raw),
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

          // single jsxtext:
          // <div>你好<strong>{userName}</strong></div>
          // =>
          // <div>{a18n("你好")}<strong>{userName}</strong></div>
          //
          // multiple jsxtext:
          // <div>你好，<strong>{userName}</strong>!!!</div>
          // =>
          // <div>{a18n.x`你好，${(<strong>{userName}</strong>)}!!!`}</div>
          case 'JSXText': {
            if (needTranslate(node.value)) {
              const parent = path.parent as t.JSXElement | t.JSXFragment
              const parentPath = path.parentPath as NodePath<
                t.JSXElement | t.JSXFragment
              >
              const isJSXParent =
                t.isJSXElement(parent) || t.isJSXFragment(parent)
              if (!isJSXParent) {
                break
              }

              const hasText = (child: t.Node): boolean =>
                t.isJSXText(child) && child.value.trim() !== ''

              const shouldWrapMultiple =
                parent.children.filter(hasText).length > 1

              if (shouldWrapMultiple) {
                // avoid parent node wrapped multiple times from its jsxtext children,
                // only let the first qualified text node trigger wrapping
                const theOne = parent.children.find(hasText)
                if (theOne && theOne.start !== node.start) {
                  break
                }
                const expressions: Array<t.Expression> = []
                const quasis: Array<t.TemplateElement> = []

                let lastIsText = false
                const ensureLastText = () => {
                  if (!lastIsText) {
                    quasis.push(
                      t.templateElement({
                        raw: '',
                        cooked: '',
                      }),
                    )
                  }
                  lastIsText = true
                }
                ;(parent as t.JSXElement | t.JSXFragment).children.forEach(
                  (child) => {
                    if (t.isJSXText(child)) {
                      if (lastIsText) {
                        const last = quasis[quasis.length - 1]
                        last.value.cooked =
                          (last.value.cooked ?? '') + child.value.trim()
                        last.value.raw = (last.value.cooked ?? '').replace(
                          /\\|`|\${/g,
                          '\\$&',
                        )
                      } else {
                        quasis.push(
                          t.templateElement({
                            raw:
                              // Add a backslash before every ‘`’, ‘\’ and ‘${’.
                              // https://github.com/babel/babel/issues/9242#issuecomment-532529613
                              child.value.trim().replace(/\\|`|\${/g, '\\$&'),
                            cooked: child.value.trim(),
                          }),
                        )
                      }
                      lastIsText = true
                    } else {
                      if (t.isJSXExpressionContainer(child)) {
                        if (t.isJSXEmptyExpression(child.expression)) {
                          console.warn('[wrap] unexpected JSXEmptyExpression', {
                            child,
                            parent,
                          })
                        } else {
                          ensureLastText()
                          expressions.push(child.expression)
                          lastIsText = false
                        }
                      } else if (t.isJSXSpreadChild(child)) {
                        console.warn('[wrap] unexpected JSXSpreadChild', {
                          child,
                          parent,
                        })
                      } else {
                        ensureLastText()
                        expressions.push(child)
                        lastIsText = false
                      }
                    }
                  },
                )
                ensureLastText()

                const children = [
                  t.jsxExpressionContainer(
                    t.taggedTemplateExpression(
                      t.memberExpression(
                        t.identifier(LIB_IDENTIFIER),
                        t.identifier(LIB_METHOD_X_IDENTIFIER),
                      ),
                      t.templateLiteral(quasis, expressions),
                    ),
                  ),
                ]

                if (t.isJSXElement(parent)) {
                  if (checkOnly) {
                    addDynamicText(
                      node,
                      quasis.map((q) => q.value.cooked ?? q.value.raw),
                    )
                  } else {
                    parentPath.replaceWith(
                      t.jsxElement(
                        parent.openingElement,
                        parent.closingElement,
                        children,
                      ),
                    )
                  }
                } else if (t.isJSXFragment(parent)) {
                  if (checkOnly) {
                    addDynamicText(
                      node,
                      quasis.map((q) => q.value.cooked ?? q.value.raw),
                    )
                  } else {
                    parentPath.replaceWith(
                      t.jsxFragment(
                        parent.openingFragment,
                        parent.closingFragment,
                        children,
                      ),
                    )
                  }
                }
              } else {
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

              const isFactoryMethod =
                node.callee.name === LIB_FACTORY_IDENTIFIER
              if (isFactoryMethod) {
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

  const shouldKeepFactoryStatement =
    (libImportStatus.imported || libImportStatus.required) &&
    libImportStatus.namespace == namespace &&
    newModuleName === existModuleName
  if (shouldKeepFactoryStatement) {
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
      ? newModuleName
        ? `const a18n = ${LIB_FACTORY_IDENTIFIER}('${namespace}', '${newModuleName}')\n`
        : `const a18n = ${LIB_FACTORY_IDENTIFIER}('${namespace}')\n`
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
  params: WrapOptions & {
    write: boolean
  },
) => {
  try {
    const content = readFile(filePath)
    const { output: newContent, sourceTexts } = wrapCode(content, {
      filePath,
      ...params,
    })

    const changed = newContent !== content
    if (changed && params.write && !params.checkOnly) {
      writeFile(filePath, newContent)
    }
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
