import { createHash } from 'node:crypto'
import { md5 } from '../src/lib/md5.ts'

const tests = [
  '',
  'a',
  'abc',
  'message digest',
  'abcdefghijklmnopqrstuvwxyz',
  'The quick brown fox jumps over the lazy dog',
  'password' + 'aB3xY9',
  'x'.repeat(55),
  'x'.repeat(56),
  'x'.repeat(63),
  'x'.repeat(64),
  'x'.repeat(100),
  'x'.repeat(128),
  'Música çãé & 123 🎵',
  'a'.repeat(1000),
]

let ok = true
for (const t of tests) {
  const exp = createHash('md5').update(t, 'utf8').digest('hex')
  const got = md5(t)
  if (exp !== got) {
    ok = false
    console.log(`FAIL len=${t.length}: got=${got} expected=${exp}`)
  }
}
console.log(ok ? `ALL OK (${tests.length} casos)` : 'FAILED')
