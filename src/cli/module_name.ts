import traverse from '@babel/traverse'
import * as t from '@babel/types'
import { LIB_FACTORY_IDENTIFIER } from './constants'

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
export const extractModuleName = (ast: any): string | undefined => {
  let moduleName: string | undefined
  let moduleNameCount = 0
  traverse(ast, {
    enter(path) {
      const node = path.node
      switch (node.type) {
        case 'CallExpression': {
          if (t.isIdentifier(node.callee)) {
            const isFactoryMethod = node.callee.name === LIB_FACTORY_IDENTIFIER
            if (isFactoryMethod) {
              moduleName = fromStringLiteral(node.arguments[1])
              moduleNameCount++
            }
          }
          break
        }
      }
    },
  })

  if (moduleNameCount > 1) {
    throw new Error('multiple module names found')
  }
  return moduleName
}
