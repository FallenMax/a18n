import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { getA18n, LocaleResource } from '../../i18n/index'
import { A18n } from '../../types'
import { LIB_IDENTIFIER, LIB_METHOD_X_IDENTIFIER } from '../constants'
import { extractModuleName } from '../module_name'
import { sourceTextToKey } from '../source_to_key'
import { parse, print } from '../util/ast'
import { readFile, writeFile } from '../util/file'

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

const translateTemplateLiteral = (
  translator: A18n,
  old: t.TemplateLiteral,
): t.TemplateLiteral | undefined => {
  const { quasis = [], expressions = [] } = old
  const textParts = quasis.map((q) => q.value.cooked ?? q.value.raw)
  const currentKey = sourceTextToKey({
    type: 'interpolated',
    textParts,
  })
  const results = translator.x(
    (textParts as any) as TemplateStringsArray, // we are not using .raw property in a18n
    ...expressions,
  )

  const newTextParts = results.filter((r, i) => {
    return i % 2 === 0
  })
  const newQuasis: t.TemplateElement[] = newTextParts.map((str) => {
    return t.templateElement({ raw: str, cooked: str })
  })
  const nextKey = sourceTextToKey({
    type: 'interpolated',
    textParts: newTextParts,
  })
  if (currentKey === nextKey) return undefined
  const newExpressions: t.Expression[] = results.filter((r, i) => {
    return i % 2 === 1
  })
  const newTemplateLiteral = t.templateLiteral(
    newQuasis,
    newExpressions, // TODO
  )
  return newTemplateLiteral
}

export const replaceCode = (
  code: string,
  options: {
    filePath?: string
    locale: string
    resource: LocaleResource
  },
): {
  output: string
} => {
  const ast = parse(code)
  const { locale, resource, filePath } = options
  const moduleName = extractModuleName(ast)
  const a18n = getA18n('ns', moduleName) // ns not important here

  a18n.addLocaleResource(locale, resource)
  a18n.setLocale(locale)

  traverse(ast, {
    enter(path) {
      const node = path.node
      const parent = path.parent

      switch (node.type) {
        case 'CallExpression': {
          // a18n("something")
          if (
            t.isIdentifier(node.callee) &&
            node.callee.name === LIB_IDENTIFIER
          ) {
            const arg0 = node.arguments[0]
            const text = fromStringLiteral(arg0)
            if (text != null) {
              const translated = a18n(text)
              if (text !== translated) {
                path.replaceWith(
                  t.callExpression(t.identifier(LIB_IDENTIFIER), [
                    t.stringLiteral(translated),
                  ]),
                )
              }
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
          break
        }

        case 'TaggedTemplateExpression': {
          const { tag } = node
          // a18n`something`
          if (t.isIdentifier(tag) && tag.name === LIB_IDENTIFIER) {
            const newTemplateLiteral = translateTemplateLiteral(
              a18n,
              node.quasi,
            )

            if (newTemplateLiteral) {
              path.replaceWith(
                t.taggedTemplateExpression(
                  t.identifier(LIB_IDENTIFIER),
                  newTemplateLiteral,
                ),
              )
            }
            break
          }

          // a18n.x`something`
          if (
            t.isMemberExpression(tag) &&
            t.isIdentifier(tag.object) &&
            tag.object.name === LIB_IDENTIFIER &&
            t.isIdentifier(tag.property) &&
            tag.property.name === LIB_METHOD_X_IDENTIFIER
          ) {
            const newTemplateLiteral = translateTemplateLiteral(
              a18n,
              node.quasi,
            )

            if (newTemplateLiteral) {
              path.replaceWith(
                t.taggedTemplateExpression(
                  t.memberExpression(tag.object, tag.property),
                  newTemplateLiteral,
                ),
              )
            }
            break
          }
        }
      }
    },
  })

  const output = print(ast)
  return { output }
}

export const replaceFile = (
  filePath: string,
  params: {
    write: boolean
    locale: string
    resource: Record<string, string | null>
  },
) => {
  try {
    const content = readFile(filePath)
    const { locale, resource, write } = params
    const { output: newContent } = replaceCode(content, {
      filePath,
      locale,
      resource,
    })

    const changed = newContent !== content
    if (changed && write) {
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
