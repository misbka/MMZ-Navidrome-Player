import { parseLRC } from '../src/services/lrclib.ts'

const sample = `[ti:Teste]
[ar:Artista]
[00:12.50]Primeira linha
[00:17.32]Segunda linha
[01:02]Terceira linha sem milissegundos
[1:02:03.5]Formato com horas
[00:30.1]Linha repetida no tempo`

const lines = parseLRC(sample)
console.log(JSON.stringify(lines, null, 2))

const checks: Array<[string, boolean]> = [
  ['ignora metadados [ti:]/[ar:]', !lines.some((l) => l.text.includes('ti:') || l.text.includes('ar:'))],
  ['12.50 -> 12.5s', lines.find((l) => l.text === 'Primeira linha')?.time === 12.5],
  ['17.32 -> 17.32s', lines.find((l) => l.text === 'Segunda linha')?.time === 17.32],
  ['01:02 -> 62s', lines.find((l) => l.text === 'Terceira linha sem milissegundos')?.time === 62],
  [
    '1:02:03.5 -> 3723.5s',
    lines.find((l) => l.text === 'Formato com horas')?.time === 3723.5,
  ],
  ['linhas ordenadas por tempo', lines.every((l, i) => i === 0 || l.time >= lines[i - 1]!.time)],
  ['total de 5 linhas', lines.length === 5],
]

let ok = true
for (const [name, pass] of checks) {
  if (!pass) ok = false
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}`)
}
console.log(ok ? '\nALL OK' : '\nFAILED')
