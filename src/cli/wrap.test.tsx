import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as prettier from 'prettier'
import { sourceTextToKey } from '../util/locale'
import { needTranslate, wrapCode as wrap } from './wrap/tsx-wrapper'

const format = (str: string) => {
  return prettier.format(str, { parser: 'babel-ts' })
}
const wrapCode = (...args: Parameters<typeof wrap>) => wrap(...args).output

describe('wrap', () => {
  test('needTranslate() should return true for non-ascii words and sentences', () => {
    const n = needTranslate
    expect(n('')).toBe(false)
    expect(n(' ')).toBe(false)
    expect(n('\t')).toBe(false)
    expect(n('      ')).toBe(false) // nbsp
    expect(n(' \n ')).toBe(false)
    expect(n('some')).toBe(false)
    expect(n('some thing')).toBe(false)
    expect(n('+-*/!@#$%^&*()_+|-=`~[]{};\':",./<>?')).toBe(false)

    expect(n('中文')).toBe(true)
    const hellos = [
      // 'Afrikaans ~ Hallo (Don.Rodrigo)',
      'Albanian ~ Mirë dita (OKAMOTO_Yusuke)',
      'Amharic ~ ታዲያስ Pronunciation: tadiyas (Adamyoung97)',
      'Arabic ~ مرحبا or مَرْحَبًا Pronunciation: marhaban or Marhabaa (Adamyoung97 and MaeeSafaee)',
      'Azerbaijani ~ Салам or سلام Pronunciation: Salam (Andro777)',
      'Bengali ~ নমস্কার Pronunciation: nomoshkaar or namaskar (TanytopiSal)',
      // 'Bosnian ~ Zdravo (89Edina89 )',
      'Bulgarian (Formal) ~ Здравей Pronunciation: zdravey (samuelianadams)',
      'Bulgarian (Informal) ~ Здрасти Pronunciation: zdrasti (samuelianadams)',
      // 'Croatian ~ Bok (Diogo.D)',
      // 'Czech ~ ahoj (Inkybaba)',
      // 'Danish ~ Hej (Brenzo44)',
      // 'Dutch ~ Hallo (Snowflake_s)',
      // 'English ~ Hello',
      // 'Esperanto ~ Saluton (JessePaedia and Rythmixed)',
      // 'Estonian ~ Tere (Inkybaba)',
      'Farsi ~ سلام or درود بر تو or درود بر شما Pronunciation: Salaam or Dorood bar to or D orood bar shoma (MaeeSafaee and Andro777)',
      // 'Fijian ~ Bula (JessePaedia)',
      // 'Finnish ~ Terve (CreeperGhostGirl)',
      // 'French (Formal)~ Bonjour (CatGirl97)',
      // 'French (Informal) ~ Salut (CatGirl97)',
      // 'German ~Hallo (Snowflake_s)',
      'Greek ~ Γεια σου Pronunciation: yiassoo (Diogo.D)',
      // 'Hawaiian ~ Aloha (jabramsohn)',
      'Hebrew ~ שלום Pronunciation: Shalom (HellerM and Adamyoung97)',
      'Hindi ~ नमस्ते Pronunciation: Namastē (Remoonline)',
      // 'Hungarian (Plural) ~ Sziasztok (Stuttgart3)',
      // 'Hungarian (Singular) ~ Szia (Adamyoung97)',
      // 'Indonesian ~ Halo or Hai (JessePaedia)',
      // 'Irish (Plural) ~ Dia dhaoibh (BryanEDU)',
      // 'Irish (Singular)~ Dia dhuit (BryanEDU)',
      // 'Italian (Formal) ~ Salve (AV_5100)',
      // 'Italian (Informal) ~ Ciao (Jaycat1234)',
      "Japanese ~ こんにちは Pronunciation: Kon'nichiwa (CreeperGhostGirl and Nitram15)",
      'Kannada ~ ನಮಸ್ಕಾರ Pronunciation: namaskār (LeMaitre)',
      'Khmer (Formal) ~ ជំរាបសួរ Pronunciation: cham reap sour (Anna._)',
      'Korean (Formal) ~ 안녕하세요 Pronunciation: an-nyeong-ha-se-yo (Anna._)',
      'Korean (Informal) ~ 안녕 Pronunciation: annyeong (TheBryce and Anna._)',
      'Lao: ~ ສະບາຍດີ Pronunciation: Sabaai-dii (OKAMOTO_Yusuke)',
      // 'Latin (Plural) ~ Salvete (Knittingirl)',
      // 'Latin (Singular) ~ Salve (Knittingirl)',
      // 'Latvian ~ Sveiki (Inkybaba)',
      // 'Limburgish ~ Hallau (Don.Rodrigo)',
      // 'Lithuanian ~ Sveiki (Inkybaba)',
      'Macedonian ~ Добар ден Pronunciation: Dobar den (OKAMOTO_Yusuke)',
      // 'Malaysian (Noon to 2pm) ~ Selamat tengahari (OKAMOTO_Yusuke)',
      // 'Malaysian (2pm to sunset) ~ Selamat petang (OKAMOTO_Yusuke)',
      'Maltese ~ Ħelow (CreeperGhostGirl and StrapsOption)',
      'Mandarin Chinese ~ 你好 Pronunciation: nǐ hǎo (Rhythmialex)',
      // 'Maori ~ Kia ora (JessePaedia)',
      // 'Norwegian ~ Hei (AV_5100)',
      'Odia ~ ନମସ୍କାର Pronunciation: Namaskār (Remoonline)',
      'Polish ~ Cześć or Hej (Baakamono)',
      // 'Portuguese ~ Oi (Diogo.D)',
      // 'Romanian ~ alo or salut (Inkybaba)',
      'Russian ~ Здравствуйте Pronunciation: Zdrahstvootye or Привет Pronunciation: Preevyet (Language020)',
      'Scottish Gaelic ~ Haló (ADSharpe)',
      'Serbian ~ Здраво Pronunciation: Zdravo (De_aapje)',
      'Shanghainese ~ 侬好 Pronunciation: noŋ hɔ (OKAMOTO_Yusuke)',
      // 'Slovak ~ ahoj (Inkybaba)',
      // 'Spanish ~ Hola',
      'Swabian ~ Grüss Gott (DrWho100)',
      // 'Swahili ~ Hujambo (S-G-Miller)',
      'Swedish ~ Hej or Hallá (Brenzo44 and Krekt)',
      // 'Swiss German (Informal) ~ Hoi (Jabramsohn)',
      'Swiss German (Plural, Formal) ~ Grüezi mitenand (Jabramsohn)',
      'Swiss German (Singular, Formal) ~ Grüezi (Jabramsohn)',
      'Tamil ~ வனக்கம் Pronunciation: vanakkam (LeMaitre)',
      'Telugu ~ నమస్కారం Pronunciation: namaskāram (LeMaitre)',
      'Thai (Female) ~ สวัสดีค่ะ Pronunciation: sawatdeekha (Anna._)',
      'Thai (Male) ~ สวัสดีครับ pronunciation: sawatdeekhrap (Anna._)',
      // 'Turkish ~ Merhaba (AV_5100)',
      'Vietnamese ~ Xin chào (Krekt)',
      // 'Woiworung ~ Womenjeka (JessePaedia)',
      'Yiddish ~ שלום Pronunciation: Sholem (S-G-Miller and Jabramsohn)',
    ]
    hellos.forEach((str) => {
      let [_, word] = /~ ([^\(]+) \(/.exec(str) || []
      word = word.replace(/pronunciation.+$/gi, '')
      expect(n(word)).toEqual(true)
    })
  })
  test('add a18n() calls ', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-input.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const expected = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-output.mock.tsx'),
      { encoding: 'utf-8' },
    )

    expect(format(wrapCode(source, { namespace: undefined }))).toBe(
      format(expected),
    )
    // ensure we don't double wrap a18n()
    expect(wrapCode(expected, { namespace: undefined })).toBe(expected)
  })

  test('returns unwrapped "sourceTexts" when checkOnly=true', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/cli/__test__/wrap-input.mock.tsx'),
      { encoding: 'utf-8' },
    )
    const { sourceTexts } = wrap(source, { checkOnly: true })
    const keys = sourceTexts.map(sourceTextToKey)
    expect(keys).toEqual([
      '中文',
      '中文',
      '中文2',
      '中文22',
      'eng 中间有中文 lish',
      '中文%s',
      '星期%s',
      '周%s',
      '我喜欢',
      '这样子',
      '生活',
      '我喜欢',
      '这样子',
      '中文3',
    ])
  })

  test('igore file containing `@a18n-ignore-file` ', () => {
    const source = `// @a18n-ignore-file

  const s = '中文'
  `

    const expected = `// @a18n-ignore-file

  const s = '中文'
  `

    expect(wrapCode(source, { namespace: undefined })).toBe(expected)

    // ensure we don't double wrap a18n()
    expect(wrapCode(expected, { namespace: undefined })).toBe(expected)
  })

  describe('add import statement: without namespace', () => {
    test(`don't add if not needed`, () => {
      expect(wrapCode(`const s = 'english'`, { namespace: undefined })).toBe(
        `const s = 'english'`,
      )
    })

    test('add import statement', () => {
      expect(wrapCode(`const s = '中文'`, { namespace: undefined }))
        .toBe(`import a18n from 'a18n'
const s = a18n('中文')`)
    })

    test(`don't add import statement if existed`, () => {
      expect(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`import a18n from 'a18n'
const s = a18n('中文')`)
    })
    test(`don't unnecessarily change existed import statement`, () => {
      expect(
        wrapCode(
          `import * as React from 'react'
import a18n from 'a18n'
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`import * as React from 'react'
import a18n from 'a18n'
const s = a18n('中文')`)
    })

    test(`add require() if code base is using require()`, () => {
      expect(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: undefined },
        ),
      ).toBe(`const a18n = require('a18n')
const React = require('react')
const s = a18n('中文')`)
    })
  })

  describe('add import statement: with namespace', () => {
    test("don't need import/require", () => {
      expect(
        wrapCode(`const s = 'english'`, { namespace: 'my-namespace' }),
      ).toBe(`const s = 'english'`)
    })

    test(`add import`, () => {
      expect(wrapCode(`const s = '中文'`, { namespace: 'my-namespace' }))
        .toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace import: replace non-namespaced a18n`, () => {
      expect(
        wrapCode(
          `import a18n from 'a18n'
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace import: replace namespaced a18n`, () => {
      expect(
        wrapCode(
          `import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`import { getA18n } from 'a18n'
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`retain import: don't make unnecessary change`, () => {
      expect(
        wrapCode(
          `import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'your-namespace' },
        ),
      ).toBe(`import * as React from 'react'
import { getA18n } from 'a18n'
const a18n = getA18n('your-namespace')
const s = a18n('中文')`)
    })

    test(`add require`, () => {
      expect(
        wrapCode(
          `const React = require('react')
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const React = require('react')
const s = a18n('中文')`)
    })

    test(`replace require: replace non-namespaced a18n`, () => {
      expect(
        wrapCode(
          `const a18n = require('a18n')
const s = '中文'`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })

    test(`replace require: replace namespaced a18n`, () => {
      expect(
        wrapCode(
          `const { getA18n } = require('a18n')
const a18n = getA18n('your-namespace')
const s = a18n('中文')`,
          { namespace: 'my-namespace' },
        ),
      ).toBe(`const { getA18n } = require('a18n')
const a18n = getA18n('my-namespace')
const s = a18n('中文')`)
    })
  })
})
