import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'

export default {
  input: 'src/i18n/index.ts',
  output: {
    file: 'dist/a18n.min.js',
    format: 'umd',
    name: 'a18n',
  },
  plugins: [
    typescript({
      tsconfig: 'tsconfig.browser.json',
    }),
    terser(),
  ],
}
