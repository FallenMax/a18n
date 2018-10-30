import { execSync } from 'child_process'

export const run = (cmd: string) =>
  execSync(cmd, {
    encoding: 'utf8',
  })
