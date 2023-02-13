# a18n - automated i18n solution

[![npm package](https://img.shields.io/npm/v/a18n.svg)](https://www.npmjs.com/package/a18n) [![build](https://github.com/fallenmax/a18n/workflows/CI/badge.svg)](https://github.com/FallenMax/a18n/actions) [![Coverage](https://img.shields.io/codecov/c/github/fallenmax/a18n)](https://codecov.io/github/fallenmax/a18n)

[English](https://github.com/FallenMax/a18n/blob/master/README.md) | [中文](https://github.com/FallenMax/a18n/blob/master/README_zh-cn.md)

`a18n` is a production-ready internationalization solution that aims for maximum automation and simplicity.

It can **wrap** and **extract** texts in JavaScript/TypeScript code using AST manipulation, so you can effortlessly add i18n support to new or existing projects.

With its ability to recognize texts and resources, it can **check** for untranslated texts in code and resources, prune unused resources, and automatically provide texts context both for extraction and translation.

[![Screen Recoding](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif?raw=true)](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif)

## Features

- Command Line Tool
  - **Wrap** texts with translation calls (`a18n wrap`). (English and CJK texts are currently supported)
  - **Extract** texts from translation calls (`a18n extract`)
  - **Check** for untranslated text in code and resources (`a18n check`)
  - **Replace** untranslated text with translations (`a18n replace`)
  - **Purge** translation calls and imports (`a18n purge`)
  - Supports dynamic texts in ES6 Template Strings
  - Supports TypeScript
  - Supports React and any JSX framework
  - Provides context for texts with the corresponding module
- Runtime
  - Translates both static and dynamic texts using provided locale resources
  - Small - only ~200 lines of code
  - Optimized for performance - dynamic texts are compiled into a template on the first run for maximum speed.

## Getting Started

> WARNING: Existing project code will be modified. Please make a backup or commit before proceeding.

Install as a project dependency (not a devDependency, as `a18n` provides both a CLI and runtime)

```sh
npm install --save a18n
```

Scan and modify code files (.js, .ts, .jsx, .tsx) in the src directory. This will wrap plain text strings with translation calls:

- `--namespace` serves to avoid conflicts with the same a18n instance from other dependencies
- `--module-name` automatically provides context for each text and helps distinguish texts from different modules
- `--text=cjk` wraps CJK texts. You can also use `--text=capitalized` to wrap English words or sentences

```sh
npx a18n wrap src --write --namespace="my.unique.project.id" --module-name="fileDirAndName" --text="cjk"
```

Manually check for unintended modifications and fix them. You can:

- Use the comment `// @a18n-ignore` to ignore the next line
- Use the comment `/* @a18n-ignore-file */` to ignore the entire file

Extract texts passed to translation calls (this will generate `zh-CN.json`, `en.json` in the `./locales` directory):

```sh
npx a18n extract src ./locales --locales zh-CN,en
```

Translate resources under `./locales` (e.g. from Chinese to English). After this, you should have something like this:
(the key is added by the `a18n` tool, the value is filled in by a human translator)

```js
{
  // missing translation, will fallback to original key
  "no-translation": null,

  // static text
  "早上好": "Good morning",

  // dynamic text
  "%s是最好吃的": "pizza is better than %s",

  // with module context
  "some.module: {
    "%s是最好吃的": "noodle is better than %s",
  }
}
```

Load translation resources and specify the language at the start of your application, **this must be done BEFORE running any other code**

```js
import a18n from 'a18n'
import en from './locales/en.json'

a18n.addLocaleResource('en', en)
a18n.setLocale('en')

// now, a18n() will produce translated result
a18n('早上好') // === "Good morning"

const food = 'A'
a18n`${food}是最好吃的` // === "pizza is better than A"
```

## Documentation

### API

#### a18n(text)

> This function can and should be auto-added by `a18n wrap` command

Translates static text, `text` should be literal string (instead of a variable). For example:

```js
a18n('你好') // good
a18n(greeting) // bad, `a18n extract` cannot extract "你好" by analyzing code
```

#### a18n\`text\${variable}\`

> This function can/should be auto-added by `a18n wrap` command

Translates dynamic text.

This is an ES6 syntax called [Tagged Template Literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)

#### a18n.x\`text\${variable}\`

> This function cannot be auto-added and should be added by user.

Translates dynamic text and returns an array containing translated parts.

This method is useful for displaying mixed content.

```jsx
const greeting = <div>{a18n.x`Hello ${<strong>Jimmy<strong>}`}</div>
// could evaluate to:
// <div>你好 <strong>Jimmy<strong></div>
```

#### a18n.setLocale(locale)

Set locale to use.

This method should be called BEFORE every `a18n` translation functions are called.

`a18n` use `navigator.language` as the initial value.

#### a18n.addLocaleResource(locale, resource)

Adds a resource for the specified locale. The resource is usually extracted using the `a18n extract` command.

An example resource:

```json
{
  // missing translation, will fallback to the original key
  "no-translation": null,

  // static text
  "早上好": "Good morning",

  // dynamic text
  "%s是最好吃的": "pizza is better than %s"

  // the resource can be organized by module, it can then used by the corresponding instance,
  // created from `getA18n('my-project-namespace', 'my.module.x')`
  "my.module.x": {
    "你好": "Hello from my module",
  }
}
```

Will merge with existing resource and overwrite values that have same keys.

This method should be called BEFORE every `a18n` translation functions are called.

#### a18n.getA18n(namespace, moduleName?)

> this method is usually auto added with `a18n wrap` command, with `--namespace` option

Get an a18n instance with the specified namespace and modules.

You can use a unique `namespace` to get isolated resources and locales, even if different parts of system are reusing a18n as common dependency (which is common in large projects).

If `moduleName` is provided, this a18n instance will select `resource[moduleName]` as the resource. This serves as a way to split resources into different modules.

See [Q & A](#2-when-do-i-need-to-specify-a-namespace) for more background.

#### a18n.DEBUG_setRepeat(repeatCount, separator?)

Repeats the translated string/array multiple times, so that UI issues like text overflow can be easily spotted.

- `repeatCount`: how many times to repeat the text
- `separator`: separator between repeated text, default to ` ` (a space)

### CLI

See: `npx a18n --help`

## Q & A

### 1. Why is it important to load translation resources and specify a locale **before ** all other code is run?

This can be illustrated with this example:

```js
const s = a18n('apple') // We don't have locale resources yet, so `s` is bound to 'apple', not '苹果' as we intended.

a18n.addLocaleResource('zh-CN', { apple: '苹果' }) // ...Too late
a18n.setLocale('zh-CN') // ...Too late

console.log(s) // 'apple'
```

It is important to load translation resources and specify a locale before all other code is run because if you don't, the a18n function may not have access to the correct translation resources and locale, and will default to the original text.

### 2. When do I need to specify a namespace?

If there are multiple dependencies in the project that further depend on `a18n`, some bundling tools (such as webpack) may generate a bundle where they all share a single copy of the `a18n` code and a single copy of the `a18n` instance at runtime. Since `a18n` is a singleton, this may cause unintended locale resource sharing/conflict.

To solve this problem, different dependencies can get their own a18n instances, differentiated by namespace, using `getA18n(namespace)`, and continue to have isolated resources and language configurations. It is also possible to acquire the same a18n instance by specifying the same namespace in order to share language and translation resources.
