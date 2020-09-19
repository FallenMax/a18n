# a18n

[![npm package](https://img.shields.io/npm/v/a18n.svg)](https://www.npmjs.com/package/a18n) [![build](https://github.com/fallenmax/a18n/workflows/CI/badge.svg)](https://github.com/FallenMax/a18n/actions) [![Coverage](https://img.shields.io/codecov/c/github/fallenmax/a18n)](https://codecov.io/github/fallenmax/a18n)

[English](https://github.com/FallenMax/a18n/blob/master/README.md) | [中文](https://github.com/FallenMax/a18n/blob/master/README_zh-cn.md)

Automated I18n solution for JavaScript/TypeScript/React.

This lib wraps and extracts text in js/ts/jsx/tsx files using AST manipulation, making adding I18n support a breeze.

[![Screen Recoding](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif?raw=true)](https://github.com/FallenMax/a18n/blob/master/assets/screen-recording.gif)

## Features

- CLI (for code modification):
  - Wrap texts with translation calls (`a18n wrap`)
    > Note:
    > "Wrap" is only applied to non-ascii texts (e.g. Chinese, Japanese, etc), so texts in English are not supported for now. Discussion is welcomed
  - Extract text (from translation calls) from code (`a18n extract`)
  - Support dynamic texts in ES6 Template String
  - Support TypeScript
  - Support React, or any framework that uses JSX
  - Ignore lines or files with annotation comments
  - Preserves original code formatting while modifying code (though [prettier](https://github.com/prettier/prettier) is still recommended)
  - Bonus: in case you regret using this lib (please tell us why), you can remove `a18n` calls (`a18n purge`)
- Runtime (for text translation):
  - Translate static and dynamic texts using provided locale resource
  - Tiny (~ 200 loc)

## Getting Started

> WARNING: existing project code will be modified, backup or commit before proceed

Install as dependency (not devDependency, as `a18n` is both a CLI and a runtime)

```sh
cd that_legacy_codebase
npm install --save a18n # or: yarn add a18n
```

Scan and modify code files (.js, .ts, .jsx, .tsx) in `src` directory, this will wrap _non-english_ text strings with translation calls:

```sh
npx a18n wrap src --write
```

Manually check for unintended modifications and fix them

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

### a18n runtime

See [Getting Started](#getting-started) section, that's everything to know

### a18n CLI

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
