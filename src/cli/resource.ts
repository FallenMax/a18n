import { LocaleResource } from '../i18n'
import { FormattedText } from '../types'
import { isObject } from '../util/is_object'

export const getFormatted = (
  resource: LocaleResource,
  moduleName: string | undefined,
  key: string,
): FormattedText => {
  if (moduleName != null) {
    let mod = resource[moduleName]
    if (!isObject(mod)) {
      return null
    } else {
      return mod[key] ?? null
    }
  } else {
    const valueOrMod = resource[key]
    if (isObject(valueOrMod)) {
      console.warn(`[a18n] expected string at ${key}, but got:`, valueOrMod)
      return null
    } else {
      return valueOrMod ?? null
    }
  }
}

export const isKeyExisted = (
  resource: LocaleResource,
  moduleName: string | undefined,
  key: string,
): boolean => {
  if (moduleName != null) {
    let mod = resource[moduleName]
    if (!isObject(mod)) {
      return false
    } else {
      return key in mod
    }
  } else {
    const valueOrMod = resource[key]
    if (isObject(valueOrMod)) {
      console.warn(`[a18n] expected string at ${key}, but got:`, valueOrMod)
      return false
    } else {
      return key in resource
    }
  }
}

export const putFormatted = (
  resource: LocaleResource,
  moduleName: string | undefined,
  key: string,
  value: FormattedText,
): void => {
  if (moduleName != null) {
    let mod = resource[moduleName]
    if (typeof mod === 'string') {
      console.warn(
        `[a18n] replacing formatted text ${JSON.stringify(
          mod,
        )} at ${JSON.stringify(moduleName)} with a module`,
      )
      mod = resource[moduleName] = {}
    } else {
      if (!mod) {
        mod = resource[moduleName] = {}
      }
    }
    mod[key] = value
  } else {
    const valueOrMod = resource[key]
    if (isObject(valueOrMod)) {
      console.warn(
        `[a18n] replacing module at ${JSON.stringify(
          moduleName,
        )} with formatted text`,
      )
    }
    resource[key] = value
  }
}
