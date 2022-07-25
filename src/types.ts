export type SourceTextRaw =
  | {
      type: 'string'
      text: string
      id?: string
    }
  | {
      type: 'interpolated'
      textParts: readonly string[]
      id?: string
    }

export type SourceText = SourceTextRaw & {
  key: string
  path?: string
  module?: string | undefined
  line?: number | undefined
  column?: number | undefined
  value?: FormattedText
}

export type FormattedText = null | string

export interface LocaleResource {
  [KeyOrModule: string]:
    | FormattedText
    | {
        [Key: string]: FormattedText
      }
}

export interface A18n {
  /**
   * translate static text
   *
   * @example
   * ```js
   * a18n("Good morning")
   * ```
   */
  (text: string): string

  /**
   * translate interpolated text (using ES6 Tagged Template syntax),
   *
   * @example
   * ```js
   * a18n`Hello ${userName}`
   * ```
   */
  (parts: TemplateStringsArray, ...values: (string | number)[]): string

  /**
   * translate interpolated text into an array (using ES6 Tagged Template syntax),
   *
   * difference with a18n`some{value}`: dynamic parts can be of any type and will be kept as-is in returned array.
   * this makes translating styled text easier, see example.
   *
   * @example
   * ```jsx
   * a18n.addLocaleResource('zh-CN', { 'Hello %s': '你好 %s'})
   * a18n.setLocale('zh-CN')
   *
   * const greeting = <div>Hello <strong>Jimmy<strong></div>
   *
   * // after manually add a18n.x`` or modify auto wrapped code:
   * const greeting = <div>{a18n.x`Hello ${<strong>Jimmy<strong>}`}</div>
   *
   * // will evaluate to:
   * // <div>你好 <strong>Jimmy<strong></div>
   * ```
   */
  x(parts: TemplateStringsArray, ...values: any[]): any[]

  /**
   * add resource for a language
   *
   * only affects current namespace
   * will deep-merge with existed resource, value of same key will be overwritten
   */
  addLocaleResource(locale: string, resource: LocaleResource): void
  /**
   * set current locale
   *
   * only affects current namespace
   */
  setLocale(locale: string): void

  /**
   * get current locale
   */
  getLocale(): string

  /**
   * get an instance of specified namespace
   *
   * @param namespace  same namespace will guarantee same resource/locale
   * @param moduleName  use `resource[moduleName]` as resource
   */
  getA18n(namespace: string, moduleName?: string): A18n

  DEBUG_reset(): void

  DEBUG_print(): void

  /**
   * repeat translated string/array multiple times, so that ui issues like text overflow can be spotted easily
   *
   * @param count how many times to repeat the text
   * @param separator separator between repeated text, default to ` `
   */
  DEBUG_setRepeat(
    count: number | undefined,
    separator?: string | undefined,
  ): void
}
