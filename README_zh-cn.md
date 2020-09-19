# a18n

低成本国际化(i18n)方案，通过静态分析代码，自动添加翻译调用，提取翻译资源。

## 功能

该项目同时提供命令行工具和翻译运行时：

- 命令行工具：
  - 自动修改源码，添加翻译调用(`a18n wrap`)
  - 自动根据源码提取待翻译资源 (`a18n extract`)
  - 支持动态文本翻译，如:
    > \`Hello \${name}\` --> a18n\`Hello\${name}\`
  - 支持 TypeScript，已支持 `??`, `.?` 等 esnext 语法
  - 支持 React/JSX, 支持处理 JSX 属性和文本
  - 支持用特殊注释来忽略不需要处理的行或整个文件
  - 尽量保持代码原始排版（基于 recast），当然还是推荐用 prettier 重排版一次
- 运行时：
  - 根据提供的语言和资源，完成静态文本和动态文本的翻译
  - 轻量 (~ 200 loc)

## 开始

> 共 6 步

```sh
cd that-legacy-codebase

# 1. 安装为项目依赖
npm install --save a18n # or: yarn add a18n

# 2. 用以下命令替换代码中的字符串为翻译方法调用(注意先备份代码):
npx a18n wrap . --write

# 3. 人工检查一下有没有 错改/漏改 的，修复之
#   如有不希望脚本改的行，上面加注释 `// @a18n-ignore`
#   如整个文件都不用改，文件开始处加上 `/* @a18n-ignore-file */`

# 4. 用以下根据代码中的翻译调用，导出为待翻译资源
#   会在./locales目录下生成 zh-CN.json, en.json
npx a18n extract . ./locales --locales zh-CN,en
```

```js
// 5. 将待翻译资源交付翻译，翻译好后的资源应该是类似下面的样子
//   (key是a18n工具加进去的, value是翻译人员提供的)

/*********** en.json **********/
{
  "no-translation": null,  // 没翻译，线上会fallback到备选语言或原始字符串

  "早上好": "Good morning", // 静态文本
  "%s是最棒的": "nufan is way better than %s", // 动态文本
}
```

```js
// 6. **运行任何其他代码前，加载翻译资源，指定语言**  之后`a18n()`工具就能给出正确的翻译结果了
import a18n from 'a18n'

// 加载翻译资源
a18n.addLocaleResource('en-US', require('./en.json'))

// 设置要使用的语言
a18n.setLocale('en')

// Done. 在此之后，界面语言会根据资源文件提供的翻译展示
// ...other code...
```

## 查看更多命令、参数：

`npx a18n --help`

## Q & A

### 1. 为什么必须在 **所有其他代码运行前** 载入翻译资源，并指定 locale？

否则某些代码中的变量可能无法更新，造成展示不正确。

例如：

```
const s = a18n('apple')`  //  s = 'apple'

a18n.addLocaleResource('zh-CN', {apple: '苹果'})
a18n.setLocale('zh-CN')

console.log(s) // s = 'apple' , 而不是期望的'苹果'
```

### 2. 什么情况下需要指定 namespace (命名空间)?

项目中如果有多个依赖项进一步引用了 a18n，某些打包工具（webpack）可能在打包后使其共用一份 a18n 代码，运行时共用一份 a18n 实例。由于目前 a18n 是单例模式，这就可能造成 locale resource/locale 发生冲突。

为解决这个问题，不同依赖可以通过 getA18n(namespace) 工厂方法获得专有的 a18n 实例(只要 namespace 不同)，实现不同项目间资源和配置相互独立，不受干扰。也可以通过指定相同的 namespace 来获得相同的 a18n 实例，共享语言和翻译资源。
