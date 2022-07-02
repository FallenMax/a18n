# a18n

[![npm package](https://img.shields.io/npm/v/a18n.svg)](https://www.npmjs.com/package/a18n) [![build](https://github.com/fallenmax/a18n/workflows/CI/badge.svg)](https://github.com/FallenMax/a18n/actions) [![Coverage](https://img.shields.io/codecov/c/github/fallenmax/a18n)](https://codecov.io/github/fallenmax/a18n)

[English](https://github.com/FallenMax/a18n/blob/master/README.md) | [中文](https://github.com/FallenMax/a18n/blob/master/README_zh-cn.md)

Automated I18n solution for JavaScript/TypeScript/React.

This lib wraps and extracts text in js/ts/jsx/tsx files using AST manipulation, making adding I18n support a breeze.

[![Screen Recoding](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif?raw=true)](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif)

## Features

- Command Line Tool
  - **Wrap** texts with translation calls (`a18n wrap`)
  - **Extract** texts from translation calls (`a18n extract`)
  - **Check** for untranslated text in code and resources (`a18n check`)
  - **Replace** untranslated in code with translated ones (`a18n replace`)
  - **Purge** remove translation calls and imports (`a18n purge`)
  - Support dynamic texts in ES6 Template String
  - Support TypeScript
  - Support React, or any framework that uses JSX
  - Provides context for texts with `module` they belongs to
  - Ignore lines or files with annotation comments
  - Preserves original code formatting while modifying code as much as possible (though [prettier](https://github.com/prettier/prettier) is still recommended)
- Runtime
  - Translate static and dynamic texts using provided locale resource
  - Tiny (~ 200 loc)
  - Fast, dynamic texts are compiled into template at first run

## Getting Started

> WARNING: existing project code will be modified, backup or commit before proceed

Install as project dependency (not devDependency, as `a18n` provides both CLI and runtime)

```sh
npm install --save a18n
```

Scan and modify code files (.js, .ts, .jsx, .tsx) in `src` directory, this will wrap CJK text strings with translation calls:

- `--namespace` serves the purpose to avoid conflict with same a18n instance from other dependencies
- `--module-name` automatically provides context for each text, and helps distinguish texts from different modules

```sh
npx a18n wrap src --write --namespace="my.unique.project.id" --module-name="fileDirAndName"
```

Manually check for unintended modifications and fix them, you can:

- use comment `// @a18n-ignore` to ignore next line
- use comment `/* @a18n-ignore-file */` to ignore entire file

Extract texts passed to translation calls (will generate `zh-CN.json`, `en.json` in `./locales` directory):

```sh
npx a18n extract src ./locales --locales zh-CN,en
```

Translate resources under `./locales` (e.g. from Chinese to English), after that we should have something like this:
(key is added by `a18n` tool, value is filled by some human translator)

```js
{
  // missing translation, will fallback to original key
  "no-translation": null,

  // static text
  "早上好": "Good morning",

  // dynamic text
  "%s是最好吃的": "pizza is better than %s",
}
```

Load translation resources and specify language at the start of your application, **this must be done BEFORE running any other code**

```js
import a18n from 'a18n'
a18n.addLocaleResource('en', require('./en.json'))
a18n.setLocale('en')

// now, a18n() will produce translated result
a18n('早上好') // === "Good morning"

const food = 'A'
a18n`${food}是最好吃的` // === "pizza is better than A"
```

## Documentation

### API

#### a18n(text)

> This function can/should be auto-added by `a18n wrap` command

Translate static text, `text` should be literal string (instead of variable), example:

```js
a18n('你好') // good
a18n(greeting) // bad, `a18n extract` cannot extract "你好" by analyzing code
```

#### a18n\`text\${variable}\`

> This function can/should be auto-added by `a18n wrap` command

Translate dynamic text.

This is an ES6 syntax called [Tagged Template Literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)

#### a18n.x\`text\${variable}\`

> This function cannot be auto-added, and should be added by user.

Translate dynamic text, returns an array containing translated parts.

This method is useful for displaying mixed content.

```jsx
const greeting = <div>{a18n.x`Hello ${<strong>Jimmy<strong>}`}</div>
// could evaluate to:
// <div>你好 <strong>Jimmy<strong></div>
```

#### a18n.setLocale(locale)

Set locale to use.

This method should be called BEFORE every `a18n` translation functions are called.

`a18n` use `navigator.language` as initial value

#### a18n.addLocaleResource(locale, resource)

Add resource for specified locale. Resource is usually extracted using `a18n extract` command.

Example resource:

```json
{
  // missing translation, will fallback to original key
  "no-translation": null,

  // static text
  "早上好": "Good morning",

  // dynamic text
  "%s是最好吃的": "pizza is better than %s"

  // resource can be organized by module, it can then used by corresponding instance,
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

Get an a18n instance with specified namespace and modules.

You can use unique `namespace` to get isolated resources and locales, even if different parts of system are reusing a18n as common dependency (which is common in large projects).

If `moduleName` is provided, this a18n instance will select `resource[moduleName]` as resource, this serves as a way to split resources into different modules.

See [Q & A](#2-when-do-i-need-to-specify-a-namespace) for more background.

### CLI

See: `npx a18n --help`

## Q & A

### 1. Why is it important to load translation resources and specify a locale **before ** all other code is run?

This can be illustrated with this example:

```js
const s = a18n('apple') // we don't have locale resources for the moment
// so `s` is bound to 'apple', not '苹果' as we intended.

a18n.addLocaleResource('zh-CN', { apple: '苹果' }) // ...too late
a18n.setLocale('zh-CN') // ...too late

console.log(s) // 'apple'
```

### 2. When do I need to specify a namespace?

If there are multiple dependencies in the project that further depends on a18n, some bundling tools (webpack) may generate a bundle where they all share a single copy of the a18n code and a single copy of the a18n instance at runtime. Since a18n is a singleton, this may cause unintended locale resources sharing/conflict.

To solve this problem, different dependencies can get its own a18n instances, differentiated by namespace, using `getA18n(namespace)`, and continue to have isolated resources and language configurations. It is also possible to acquire the same a18n instance by specifying same namespaces in order to share language and translation resources.
